// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// CHANGED_BY_ZIPLINE: This whole file is custom to our build.

import { Archive } from "libarchive.js/main.js";
import { keyBy, last, sortedIndexBy } from "lodash";
import Bag, { Time, TimeUtil } from "rosbag";
import "wasm-flate";
import wasmFlateWasm from "wasm-flate/wasm_flate_bg.wasm";
import yaml from "js-yaml";

import type {
  DataProvider,
  DataProviderDescriptor,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
} from "webviz-core/src/dataProviders/types";

type Options = {| files: File[] |};

const ROS_TYPES = {
  FLOAT: "float32",
  DOUBLE: "float64",
  LONG64: "int64",
  ULONG64: "uint64",
  LONG: "int32",
  ULONG: "uint32",
  SHORT: "int16",
  USHORT: "uint16",
  CHAR: "int8",
  UCHAR: "uint8",
  ACHAR: "uint8",
  OPAQUE64: "uint64",
  BOOL: "bool",
};

const ITC_BYTE_SIZES = {
  FLOAT: 4,
  DOUBLE: 8,
  LONG64: 8,
  ULONG64: 8,
  LONG: 4,
  ULONG: 4,
  SHORT: 2,
  USHORT: 2,
  CHAR: 1,
  UCHAR: 1,
  ACHAR: 1,
  OPAQUE64: 8,
  BOOL: 1,
};

const ITC_TO_DATAVIEW_METHOD = {
  FLOAT: "getFloat32",
  DOUBLE: "getFloat64",
  LONG64: "getBigInt64",
  ULONG64: "getBigUint64",
  LONG: "getInt32",
  ULONG: "getUint32",
  SHORT: "getInt16",
  USHORT: "getUint16",
  CHAR: "getInt8",
  UCHAR: "getUint8",
  ACHAR: "getUint8",
  OPAQUE64: "getBigUint64",
  BOOL: "getUint8",
};

const ITC_TO_DATAVIEW_SETTER = {
  FLOAT: "setFloat32",
  DOUBLE: "setFloat64",
  LONG64: "setBigInt64",
  ULONG64: "setBigUint64",
  LONG: "setInt32",
  ULONG: "setUint32",
  SHORT: "setInt16",
  USHORT: "setUint16",
  CHAR: "setInt8",
  UCHAR: "setUint8",
  ACHAR: "setUint8",
  OPAQUE64: "setBigUint64",
  BOOL: "setUint8",
};

function timestampToTime(timestamp: number): Time {
  return {
    sec: Math.floor(timestamp / 1e5),
    nsec: Math.floor(timestamp % 1e5) * 1e4,
  };
}

function timeToTimestamp(time: Time): number {
  return Math.floor(time.sec * 1e5 + time.nsec / 1e4);
}

type TypeInfo = {|
  messageType: string,
  messageDefinition: string,
  byteSize: number,
  modifyFunc: (dataView: DataView, offset: number) => number,
|};

Archive.init({
  workerUrl: "worker-bundle.js",
});

// Read from a ROS Bag. `bagPath` can either represent a local file, or a remote bag. See
// `BrowserHttpReader` for how to set up a remote server to be able to directly stream from it.
// Returns raw messages that still need to be parsed by `ParseMessagesDataProvider`.
export default class ZiplineItcDataProvider implements DataProvider {
  _options: Options;
  _bag: Bag;
  _filesByName: { [string]: File };
  _dataByFilename: { [string]: {| buffer: ArrayBuffer, timestamps: {| timestamp: number, index: number |}[] |} } = {};
  _typeInfoByType: { [string]: TypeInfo } = {};
  _filenameByTopic: { [string]: string } = {};
  _typeInfoByTopic: { [string]: TypeInfo } = {};

  constructor(options: Options, children: DataProviderDescriptor[]) {
    if (children.length > 0) {
      throw new Error("ZiplineItcDataProvider cannot have children");
    }
    this._options = options;
  }

  async initialize(): Promise<InitializationResult> {
    debugger;
    if (this._options.files.length === 1 && this._options.files[0].name.toLowerCase().endsWith(".zip")) {
      const archive = await Archive.open(this._options.files[0]);
      // $FlowFixMe
      this._options.files = Object.values(await archive.extractFiles()).filter((file) => file instanceof File);

      // Sadly, reading individual files on demand doesn't work because of this bug:
      // https://github.com/nika-begiashvili/libarchivejs/issues/28
      // Once that is fixed we can use this code instead:
      // const filesArray = await archive.getFilesArray();
      // // $FlowFixMe
      // this._options.files = filesArray.map((fileItem) => {
      //   return {
      //     name: fileItem.path + fileItem.file.name,
      //     async text() {
      //       return (await fileItem.file.extract()).text();
      //     },
      //     async arrayBuffer() {
      //       return (await fileItem.file.extract()).arrayBuffer();
      //     },
      //   };
      // });
    }

    await self.wasm_bindgen(wasmFlateWasm);

    this._filesByName = keyBy(this._options.files, "name");

    // $FlowFixMe
    const storkMessagesString = await this._filesByName["stork_messages.yaml"].text();
    const storkMessages = yaml.load(storkMessagesString, { json: true });
    for (const [messageType, messageData] of (Object.entries(storkMessages.messages): any)) {
      const rosFields = [];
      let byteSize = 0;
      let timestampExtractionString;
      const endiannessFixingStrings: string[] = [];
      for (const fieldWrapper of messageData.values) {
        const [fieldName, field] = (Object.entries(fieldWrapper)[0]: any); // Weird yaml structure here..

        let fieldType = field.type;
        if (!ROS_TYPES[fieldType]) {
          //If it's not a primitive, it must be an enum.
          if (!storkMessages.enums[fieldType]) {
            throw new Error(`Not a valid type and also not an enum! ${fieldType}`);
          }
          for (const enum_wrapper of storkMessages.enums[fieldType]) {
            const [enumField, enumVal] = (Object.entries(enum_wrapper)[0]: any); // Weird yaml structure again.
            // For enums, define the enum names as constants before the actual field declarations.
            // This will make them show up in Webviz (e.g. Raw Messages and Plot panels).
            rosFields.push(`uint8 ${enumField}=${Number(enumVal)}`);
          }
          fieldType = "UCHAR";
        }

        // Split up names like "filename[12]" and "format[TRACE_ENTRIES_PER_MSG]".
        const nameArrayMatches = fieldName.match(/([^[]+)(\[([^\]]+)\])?/);
        if (!nameArrayMatches) {
          throw new Error("Invalid field name");
        }
        const nameWithoutArray = nameArrayMatches[1];
        let arrayPart = nameArrayMatches[3] || "";
        if (arrayPart !== "") {
          if (isNaN(arrayPart)) {
            // Resolve constants using the "defines" part of the yaml.
            arrayPart = storkMessages.defines[arrayPart];
            if (!arrayPart) {
              throw new Error(`Couldn't resolve array constant using 'defines' in yaml: ${nameArrayMatches[3]}`);
            }
          }
          const arrayPartNumber = Number(arrayPart);

          if (ITC_BYTE_SIZES[fieldType] > 1) {
            for (let i = 0; i < arrayPartNumber; i++) {
              const offset = byteSize + ITC_BYTE_SIZES[fieldType] * i;
              endiannessFixingStrings.push(
                `dataView.${ITC_TO_DATAVIEW_SETTER[fieldType]}(offset+${offset}, dataView.${
                  ITC_TO_DATAVIEW_METHOD[fieldType]
                }(offset+${offset}), true);`
              );
            }
          }

          byteSize += ITC_BYTE_SIZES[fieldType] * arrayPartNumber;
          arrayPart = `[${arrayPartNumber}]`;
        } else {
          if (nameWithoutArray === "timestamp") {
            timestampExtractionString = `return dataView.${
              ITC_TO_DATAVIEW_METHOD[fieldType]
            }(offset+${byteSize}, true);`;
          }

          if (ITC_BYTE_SIZES[fieldType] > 1) {
            endiannessFixingStrings.push(
              `dataView.${ITC_TO_DATAVIEW_SETTER[fieldType]}(offset+${byteSize}, dataView.${
                ITC_TO_DATAVIEW_METHOD[fieldType]
              }(offset+${byteSize}), true);`
            );
          }

          byteSize += ITC_BYTE_SIZES[fieldType];
        }

        let comment = field.comment || "";
        if (comment) {
          comment = ` # ${comment}`;
        }

        rosFields.push(`${ROS_TYPES[fieldType] + arrayPart} ${nameWithoutArray}${comment}`);
      }

      if (!timestampExtractionString) {
        continue;
      }

      this._typeInfoByType[messageType] = {
        messageType,
        messageDefinition: rosFields.join("\n"),
        byteSize,
        // eslint-disable-next-line no-new-func
        modifyFunc: new Function(
          "dataView",
          "offset",
          `${endiannessFixingStrings.join("\n")}\n${timestampExtractionString}`
        ),
      };

      for (const duplicateMessageType of Object.keys(messageData.duplicates || {})) {
        this._typeInfoByType[duplicateMessageType] = this._typeInfoByType[messageType];
      }
    }

    const topics = [];
    const messageDefinitionsByTopic = {};
    let topicToDeriveTimesFrom;
    for (const filename of Object.keys(this._filesByName)) {
      if (!filename.toLowerCase().endsWith(".log") && !filename.toLowerCase().endsWith(".log.gz")) {
        continue;
      }
      const topic = `/${filename.split(".")[0]}`;
      const type = last(topic.split("__"));
      const typeInfo = this._typeInfoByType[type];
      if (!typeInfo) {
        continue;
      }
      this._filenameByTopic[topic] = filename;
      topics.push(topic);
      this._typeInfoByTopic[topic] = typeInfo;
      messageDefinitionsByTopic[topic] = typeInfo.messageDefinition;

      if (type === "ZIPNAV" && !topicToDeriveTimesFrom) {
        topicToDeriveTimesFrom = topic;
      }
    }
    if (topics.length === 0) {
      throw new Error("No readable files found");
    }

    if (!topicToDeriveTimesFrom) {
      topicToDeriveTimesFrom = topics[0];
    }

    const fileWithTimes = await this._getFile(topicToDeriveTimesFrom);
    const endTimestamp = last(fileWithTimes.timestamps).timestamp;
    let startTimestamp = fileWithTimes.timestamps[0].timestamp;
    if (startTimestamp < 200e5) {
      startTimestamp = 0;
    }

    return {
      start: timestampToTime(startTimestamp),
      end: timestampToTime(endTimestamp),
      topics: topics.map((topic) => ({ name: topic, datatype: this._typeInfoByTopic[topic].messageType })),
      providesParsedMessages: false,
      messageDefinitions: { type: "raw", messageDefinitionsByTopic },
    };
  }

  async getMessages(start: Time, end: Time, subscriptions: GetMessagesTopics): Promise<GetMessagesResult> {
    const startTimestamp = timeToTimestamp(start);
    const endTimestamp = timeToTimestamp(end);
    const topics = subscriptions.rosBinaryMessages || [];
    const messages = [];

    const fileData = await Promise.all(topics.map((topic) => this._getFile(topic)));
    for (let i = 0; i < topics.length; ++i) {
      const topic = topics[i];
      const { buffer, timestamps } = fileData[i];
      const { byteSize } = this._typeInfoByTopic[topic];
      const startIndex = sortedIndexBy(timestamps, { timestamp: startTimestamp }, "timestamp");
      const endIndex = sortedIndexBy(timestamps, { timestamp: endTimestamp + 1 }, "timestamp") - 1;
      for (let j = startIndex; j <= endIndex; ++j) {
        const { index, timestamp } = timestamps[j];
        const receiveTime = timestampToTime(timestamp);
        if (TimeUtil.isLessThan(receiveTime, start)) {
          continue;
        }
        if (TimeUtil.isLessThan(end, receiveTime)) {
          continue;
        }

        const offset = (4 + byteSize) * index + 4;
        messages.push({
          topic,
          receiveTime,
          message: buffer.slice(offset, offset + byteSize),
        });
      }
    }

    messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime));
    return { rosBinaryMessages: messages, parsedMessages: undefined, bobjects: undefined };
  }

  async close(): Promise<void> {}

  async _getFile(
    topic: string
  ): Promise<{| buffer: ArrayBuffer, timestamps: {| timestamp: number, index: number |}[] |}> {
    const filename = this._filenameByTopic[topic];
    if (!this._dataByFilename[filename]) {
      // $FlowFixMe
      let buffer = await this._filesByName[filename].arrayBuffer();

      if (filename.toLowerCase().endsWith(".log.gz")) {
        const decoded = self.wasm_bindgen.gzip_decode_raw(new Uint8Array(buffer));
        buffer = decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength);
      }
      const timestamps = [];
      const { byteSize, modifyFunc } = this._typeInfoByTopic[topic];

      const dataView = new DataView(buffer);
      let pos = 0;
      let first_itc_id;
      while (pos < buffer.byteLength) {
        const itc_id = dataView.getUint32(pos);
        first_itc_id = first_itc_id ?? itc_id;
        if (itc_id !== first_itc_id) {
          throw new Error("All messages in a LOG file should have the same type");
        }
        pos += 4;
        timestamps.push({ timestamp: modifyFunc(dataView, pos), index: timestamps.length });
        pos += byteSize;
      }
      timestamps.sort((a, b) => a.timestamp - b.timestamp);
      this._dataByFilename[filename] = { buffer, timestamps };
    }
    return this._dataByFilename[filename];
  }
}
