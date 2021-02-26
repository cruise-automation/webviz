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
import Bag, { Time, TimeUtil, MessageReader, parseMessageDefinition, MessageWriter } from "rosbag";
import "wasm-flate";
import wasmFlateWasm from "wasm-flate/wasm_flate_bg.wasm";
import yaml from "js-yaml";

import { rosMarkerArrayDefinition } from "webviz-core/src/dataProviders/rosMarkerArrayDefinition";
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

type FileData = {|
  buffer: ArrayBuffer,
  timestamps: {| timestamp: number, offsetBegin: number, offsetEnd: number |}[],
  timestamps2hz: {| timestamp: number, offsetBegin: number, offsetEnd: number |}[],
  timestamps10s: {| timestamp: number, offsetBegin: number, offsetEnd: number |}[],
|};

Archive.init({
  workerUrl: "worker-bundle.js",
});

const rosMarkerArrayWriter = new MessageWriter(parseMessageDefinition(rosMarkerArrayDefinition));

function makeMarker(marker: any) {
  return {
    header: { frame_id: "map", seq: 0, stamp: { sec: 0, nsec: 0 } },
    scale: { x: 10, y: 10, z: 10 },
    color: { r: 0, g: 1, b: 0, a: 1 },
    points: [],
    ns: "",
    id: 0,
    action: 0,
    lifetime: { sec: 0, nsec: 0 },
    frame_locked: false,
    colors: [],
    text: "",
    mesh_resource: "",
    mesh_use_embedded_materials: false,
    ...marker,
    pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 }, ...marker.pose },
  };
}

// Read from a ROS Bag. `bagPath` can either represent a local file, or a remote bag. See
// `BrowserHttpReader` for how to set up a remote server to be able to directly stream from it.
// Returns raw messages that still need to be parsed by `ParseMessagesDataProvider`.
export default class ZiplineItcDataProvider implements DataProvider {
  _options: Options;
  _bag: Bag;
  _filesByName: { [string]: File };
  _dataByFilename: { [string]: FileData } = {};
  _typeInfoByType: { [string]: TypeInfo } = {};
  _filenameByTopic: { [string]: string } = {};
  _typeInfoByTopic: { [string]: TypeInfo } = {};

  _3dTopicGeneratorByType = {
    ZIPNAV: async (baseTopic: string): Promise<{| timestamp: number, buffer: ArrayBuffer |}[]> => {
      const { buffer, timestamps2hz } = await this._getFile(baseTopic);
      const parsedDefinition = parseMessageDefinition(this._typeInfoByType.ZIPNAV.messageDefinition);
      const reader = new MessageReader(parsedDefinition, { freeze: true });
      const output = [];
      for (const timestamp of timestamps2hz) {
        const { position_ned_m } = reader.readMessage(
          Buffer.from(buffer, timestamp.offsetBegin, timestamp.offsetEnd - timestamp.offsetBegin)
        );
        const outputMessage = await rosMarkerArrayWriter.writeMessage({
          markers: [
            makeMarker({
              type: 9, // Marker.TEXT_VIEW_FACING,
              pose: { position: { x: position_ned_m[1], y: position_ned_m[0], z: -position_ned_m[2] } },
              text: "zip",
            }),
          ],
        });
        output.push({ timestamp: timestamp.timestamp, buffer: outputMessage.buffer });
      }
      return output;
    },
  };
  _3dTopicMessageCache: { [baseTopic: string]: {| timestamp: number, buffer: ArrayBuffer |}[] } = {};

  _historyTopicGeneratorByType = {
    ZIPNAV: async (baseTopic: string): Promise<ArrayBuffer> => {
      const { buffer, timestamps2hz } = await this._getFile(baseTopic);
      const parsedDefinition = parseMessageDefinition(this._typeInfoByType.ZIPNAV.messageDefinition);
      const reader = new MessageReader(parsedDefinition, { freeze: true });
      const points = [];
      for (const timestamp of timestamps2hz) {
        const { position_ned_m } = reader.readMessage(
          Buffer.from(buffer, timestamp.offsetBegin, timestamp.offsetEnd - timestamp.offsetBegin)
        );
        points.push({ x: position_ned_m[1], y: position_ned_m[0], z: -position_ned_m[2] });
      }
      const outputMessage = await rosMarkerArrayWriter.writeMessage({
        markers: [
          makeMarker({
            type: 4, // Marker.LINE_STRIP,
            scale: { x: 10, y: 10, z: 10 },
            points,
          }),
        ],
      });
      return outputMessage.buffer;
    },
  };
  _historyTopicMessageCache: { [baseTopic: string]: ArrayBuffer } = {};

  constructor(options: Options, children: DataProviderDescriptor[]) {
    if (children.length > 0) {
      throw new Error("ZiplineItcDataProvider cannot have children");
    }
    this._options = options;
  }

  async initialize(): Promise<InitializationResult> {
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

    const topicsWithDatatypes = topics.map((topic) => ({
      name: topic,
      datatype: this._typeInfoByTopic[topic].messageType,
    }));

    const augmentedTopicsWithDatatypes = [];
    const augmentedMessageDefinitionsByTopic = {};
    for (const { name, datatype } of topicsWithDatatypes) {
      augmentedTopicsWithDatatypes.push({ name, datatype });
      augmentedTopicsWithDatatypes.push({ name: `${name}/2hz`, datatype });
      augmentedTopicsWithDatatypes.push({ name: `${name}/10s`, datatype });
      augmentedMessageDefinitionsByTopic[name] = messageDefinitionsByTopic[name];
      augmentedMessageDefinitionsByTopic[`${name}/2hz`] = messageDefinitionsByTopic[name];
      augmentedMessageDefinitionsByTopic[`${name}/10s`] = messageDefinitionsByTopic[name];

      if (this._3dTopicGeneratorByType[datatype]) {
        augmentedTopicsWithDatatypes.push({ name: `${name}/3d_marker`, datatype: "visualization_msgs/MarkerArray" });
        augmentedMessageDefinitionsByTopic[`${name}/3d_marker`] = rosMarkerArrayDefinition;
      }

      if (this._historyTopicGeneratorByType[datatype]) {
        augmentedTopicsWithDatatypes.push({ name: `${name}/3d_history`, datatype: "visualization_msgs/MarkerArray" });
        augmentedMessageDefinitionsByTopic[`${name}/3d_history`] = rosMarkerArrayDefinition;
      }
    }

    return {
      start: timestampToTime(startTimestamp),
      end: timestampToTime(endTimestamp),
      topics: augmentedTopicsWithDatatypes,
      providesParsedMessages: false,
      messageDefinitions: { type: "raw", messageDefinitionsByTopic: augmentedMessageDefinitionsByTopic },
    };
  }

  async getMessages(start: Time, end: Time, subscriptions: GetMessagesTopics): Promise<GetMessagesResult> {
    const startTimestamp = timeToTimestamp(start);
    const endTimestamp = timeToTimestamp(end);
    const parsedTopics = (subscriptions.rosBinaryMessages || []).map((topic) => {
      const splitTopic = topic.split("/");
      return { baseTopic: `/${splitTopic[1]}`, topicSuffix: splitTopic[2], fullTopic: topic };
    });
    const messages = [];

    const fileData = await Promise.all(parsedTopics.map(({ baseTopic }) => this._getFile(baseTopic)));
    for (let i = 0; i < parsedTopics.length; ++i) {
      const { fullTopic, baseTopic, topicSuffix } = parsedTopics[i];

      if (topicSuffix === "3d_marker") {
        this._3dTopicMessageCache[baseTopic] =
          this._3dTopicMessageCache[baseTopic] ||
          (await this._3dTopicGeneratorByType[this._typeInfoByTopic[baseTopic].messageType](baseTopic));

        const timestamps = this._3dTopicMessageCache[baseTopic];
        const startIndex = sortedIndexBy(timestamps, { timestamp: startTimestamp - 0.1e5 }, "timestamp");
        const endIndex = sortedIndexBy(timestamps, { timestamp: endTimestamp + 0.1e5 }, "timestamp") - 1;
        for (let j = startIndex; j <= endIndex; ++j) {
          const { timestamp, buffer } = timestamps[j];
          const receiveTime = timestampToTime(timestamp);
          if (TimeUtil.isLessThan(receiveTime, start)) {
            continue;
          }
          if (TimeUtil.isLessThan(end, receiveTime)) {
            continue;
          }

          messages.push({
            topic: fullTopic,
            receiveTime,
            message: buffer.slice(0),
          });
        }
        continue;
      }

      if (topicSuffix === "3d_history") {
        this._historyTopicMessageCache[baseTopic] =
          this._historyTopicMessageCache[baseTopic] ||
          (await this._historyTopicGeneratorByType[this._typeInfoByTopic[baseTopic].messageType](baseTopic));

        for (
          let receiveTime = start;
          TimeUtil.isGreaterThan(end, receiveTime);
          receiveTime = TimeUtil.add(receiveTime, { sec: 0, nsec: 0.2e9 })
        ) {
          messages.push({
            topic: fullTopic,
            receiveTime,
            message: this._historyTopicMessageCache[baseTopic].slice(0),
          });
        }
        continue;
      }

      const { buffer } = fileData[i];
      const timestamps =
        topicSuffix === "10s"
          ? fileData[i].timestamps10s
          : topicSuffix === "2hz"
          ? fileData[i].timestamps2hz
          : fileData[i].timestamps;
      const startIndex = sortedIndexBy(timestamps, { timestamp: startTimestamp - 0.1e5 }, "timestamp");
      const endIndex = sortedIndexBy(timestamps, { timestamp: endTimestamp + 0.1e5 }, "timestamp") - 1;
      for (let j = startIndex; j <= endIndex; ++j) {
        const { timestamp, offsetBegin, offsetEnd } = timestamps[j];
        const receiveTime = timestampToTime(timestamp);
        if (TimeUtil.isLessThan(receiveTime, start)) {
          continue;
        }
        if (TimeUtil.isLessThan(end, receiveTime)) {
          continue;
        }

        messages.push({
          topic: fullTopic,
          receiveTime,
          message: buffer.slice(offsetBegin, offsetEnd),
        });
      }
    }

    messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime));
    return { rosBinaryMessages: messages, parsedMessages: undefined, bobjects: undefined };
  }

  async close(): Promise<void> {}

  async _getFile(baseTopic: string): Promise<FileData> {
    const filename = this._filenameByTopic[baseTopic];
    if (!this._dataByFilename[filename]) {
      // $FlowFixMe
      let buffer = await this._filesByName[filename].arrayBuffer();

      if (filename.toLowerCase().endsWith(".log.gz")) {
        const decoded = self.wasm_bindgen.gzip_decode_raw(new Uint8Array(buffer));
        buffer = decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength);
      }
      const timestamps = [];
      const { byteSize, modifyFunc } = this._typeInfoByTopic[baseTopic];

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
        timestamps.push({ timestamp: modifyFunc(dataView, pos), offsetBegin: pos, offsetEnd: pos + byteSize });
        pos += byteSize;
      }
      timestamps.sort((a, b) => a.timestamp - b.timestamp);

      let lastTimestamp2hz;
      let lastTimestamp10s;
      const timestamps2hz = [];
      const timestamps10s = [];
      for (const timestamp of timestamps) {
        if (!lastTimestamp10s || timestamp.timestamp >= lastTimestamp10s.timestamp + 10e5) {
          timestamps10s.push(timestamp);
          lastTimestamp10s = timestamp;
        }
        if (!lastTimestamp2hz || timestamp.timestamp >= lastTimestamp2hz.timestamp + 0.5e5) {
          timestamps2hz.push(timestamp);
          lastTimestamp2hz = timestamp;
        }
      }

      this._dataByFilename[filename] = { buffer, timestamps, timestamps2hz, timestamps10s };
    }
    return this._dataByFilename[filename];
  }
}
