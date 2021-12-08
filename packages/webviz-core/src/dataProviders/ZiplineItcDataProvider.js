// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// CHANGED_BY_ZIPLINE: This whole file is custom to our build.

import { Archive } from "libarchive.js/main.js";
import { keyBy, last, sortedIndexBy, uniq } from "lodash";
import { Time, TimeUtil, MessageReader, parseMessageDefinition, MessageWriter } from "rosbag";
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

// Make a marker, but set some defaults.
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

// Read from Zipline ITC files. The message definitionsare read from stork_messages.yaml, and the actual
// data from the individual .LOG files. It's also okay for the .LOG files to be gzipped to .LOG.gz, and
// for all of that to then be zipped once more in a .zip file (like when you download files from the
// Logbook).
export default class ZiplineItcDataProvider implements DataProvider {
  _options: Options;
  _filesByName: { [string]: File }; // File handles indexed by filename.
  _dataByFilename: { [string]: FileData } = {}; // Uncompressed / little-endian buffer (for ROS) + timestamps.
  _typeInfoByType: { [string]: TypeInfo } = {}; // Various kinds of type info, indexed by type name (e.g. "ZIPNAV").
  _filenameByTopic: { [string]: string } = {}; // Mapping from base topics to filenames.
  _typeInfoByTopic: { [string]: TypeInfo } = {}; // Same typeinfos as above, only by base topic.

  // Functions to generate ROS MarkerArray messages, for each type of message (e.g. "ZIPNAV"). Returns a bunch
  // of objects that can be turned directly into messages (timestamp + ArrayBuffer).
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
    INTRUDER_STATE: async (baseTopic: string): Promise<{| timestamp: number, buffer: ArrayBuffer |}[]> => {
      const { buffer, timestamps } = await this._getFile(baseTopic);
      const parsedDefinition = parseMessageDefinition(this._typeInfoByType.INTRUDER_STATE.messageDefinition);
      const reader = new MessageReader(parsedDefinition, { freeze: true });
      const output = [];
      for (const timestamp of timestamps) {
        const { position_ned_m } = reader.readMessage(
          Buffer.from(buffer, timestamp.offsetBegin, timestamp.offsetEnd - timestamp.offsetBegin)
        );
        const outputMessage = await rosMarkerArrayWriter.writeMessage({
          markers: [
            makeMarker({
              type: 9, // Marker.TEXT_VIEW_FACING,
              pose: { position: { x: position_ned_m[1], y: position_ned_m[0], z: -position_ned_m[2] } },
              text: "I",
              color: { r: 1, g: 1, b: 0, a: 1 },
            }),
          ],
        });
        output.push({ timestamp: timestamp.timestamp, buffer: outputMessage.buffer });
      }
      return output;
    },
    CHOSEN_AVOIDANCE_ACTION: async (baseTopic: string): Promise<{| timestamp: number, buffer: ArrayBuffer |}[]> => {
      const { buffer, timestamps } = await this._getFile(baseTopic);
      const parsedDefinition = parseMessageDefinition(this._typeInfoByType.CHOSEN_AVOIDANCE_ACTION.messageDefinition);
      const reader = new MessageReader(parsedDefinition, { freeze: true });
      const markers = [];
      for (const timestamp of timestamps) {
        const { start_n, start_e, start_d } = reader.readMessage(
          Buffer.from(buffer, timestamp.offsetBegin, timestamp.offsetEnd - timestamp.offsetBegin)
        );
        var points = [];
        var i;
        for (i = 0; i < start_n.length; i++) {
          points.push({ x: start_e[i], y: start_n[i], z: -start_d[i] });
        }
        markers.push(makeMarker({
          type: 4, // Marker.LINE_STRIP,
          scale: { x: 10, y: 10, z: 10 },
          color: { r: 0, g: 0, b: 1, a: 1 },
          points,
        }));
      }
      const outputMessage = await rosMarkerArrayWriter.writeMessage({
        markers: markers,
      });
      return outputMessage.buffer;
    },
  };
  _3dTopicMessageCache: { [baseTopic: string]: {| timestamp: number, buffer: ArrayBuffer |}[] } = {};

  // Functions to generate a single ROS MarkerArray message to show the history of some point. Again,
  // one function per message type (e.g. "ZIPNAV"). This single message is then repeated over and over,
  // so you see the same history shape no matter where you seek in the timeline.
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
    // If we're working with a .zip file, unzip it and pretend that we just got the files that were inside.
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

    // Load the wasmFlate library.
    await self.wasm_bindgen(wasmFlateWasm);

    // Index the files by filename
    this._filesByName = keyBy(this._options.files, "name");

    // Parse the stork_messages.yaml into what we need; mostly ROS message definitions.
    if (!this._filesByName["stork_messages.yaml"]) {
      throw new Error("No stork_messages.yaml found!");
    }
    // $FlowFixMe
    const storkMessagesString = await this._filesByName["stork_messages.yaml"].text();
    const storkMessages = yaml.load(storkMessagesString, { json: true });
    for (const [messageType, messageData] of (Object.entries(storkMessages.messages): any)) {
      const rosFields = []; // The ROS fields for this message.
      let byteSize = 0; // The total byte size for this message.
      let timestampExtractionString; // Javascript code for getting the timestamp from the ArrayBuffer.
      const endiannessFixingStrings: string[] = []; // A set of Javascript functions to fix the endianness (ITC=big, ROS=little).
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
          fieldType = "UCHAR"; // Enums are always single bytes.
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

          // Endianness fix. See below (at the non-array case) for an explanation.
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
          // We've encountered a field called "timestamp"; generate the code that extracts this field.
          if (nameWithoutArray === "timestamp") {
            timestampExtractionString = `return dataView.${
              ITC_TO_DATAVIEW_METHOD[fieldType]
            }(offset+${byteSize}, true);`;
          }

          // If the field is more than 1 byte long, we have to convert from big (ITC) to little (ROS)
          // endian. We do that with calls like `dataView.setUint32(offset, dataView.getUint32(offset), true);`
          // The `true` bit makes it so we write it as little endian.
          if (ITC_BYTE_SIZES[fieldType] > 1) {
            endiannessFixingStrings.push(
              `dataView.${ITC_TO_DATAVIEW_SETTER[fieldType]}(offset+${byteSize}, dataView.${
                ITC_TO_DATAVIEW_METHOD[fieldType]
              }(offset+${byteSize}), true);`
            );
          }

          byteSize += ITC_BYTE_SIZES[fieldType];
        }

        // Preserve any comments. This currently doesn't show up in the UI, but can be useful for debugging.
        let comment = field.comment || "";
        if (comment) {
          comment = ` # ${comment}`;
        }

        rosFields.push(`${ROS_TYPES[fieldType] + arrayPart} ${nameWithoutArray}${comment}`);
      }

      // If we didn't find a "timestamp" field, don't load this file.
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

      // Any "duplicate" message types just get a copy of the definition.
      for (const duplicateMessageType of Object.keys(messageData.duplicates || {})) {
        this._typeInfoByType[duplicateMessageType] = this._typeInfoByType[messageType];
      }
    }

    // Now we generate a bunch of derived information, like topic names.
    const topics = [];
    const messageDefinitionsByTopic = {};
    let topicToDeriveTimesFrom; // The topic that we'll use for the "start" and "end" times.
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

      // Just use the first "ZIPNAV" topic.
      if (type === "ZIPNAV" && !topicToDeriveTimesFrom) {
        topicToDeriveTimesFrom = topic;
      }
    }
    if (topics.length === 0) {
      throw new Error("No readable files found");
    }

    // If there was no "ZIPNAV" topic to derive the time from, just use the first topic.
    if (!topicToDeriveTimesFrom) {
      topicToDeriveTimesFrom = topics[0];
    }

    // Generate "start" and "end" times. If the start time is almost zero, then it's probably a
    // Peregrine run, so just start with 0 in that case.
    const fileWithTimes = await this._getFile(topicToDeriveTimesFrom);
    const endTimestamp = last(fileWithTimes.timestamps).timestamp + 30e5; // Add 30 seconds for good measure.
    let startTimestamp = fileWithTimes.timestamps[0].timestamp;
    if (startTimestamp < 200e5) {
      startTimestamp = 0;
    }

    const topicsWithDatatypes = topics.map((topic) => ({
      name: topic,
      datatype: this._typeInfoByTopic[topic].messageType,
    }));

    // Generate the specialized topics:
    // /my_topic/2hz: downsampled to one message every 0.5 seconds.
    // /my_topic/10s: downsampled to one message every 10 seconds.
    // /my_topic/3d_marker: marker messages, as generated by _3dTopicGeneratorByType.
    // /my_topic/3d_history: the same marker message over and over, as generated by _historyTopicGeneratorByType.
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

  // Handle a single request for messages. Note that `start` and `end` are both inclusive.
  async getMessages(start: Time, end: Time, subscriptions: GetMessagesTopics): Promise<GetMessagesResult> {
    // Convert to our 32-bit integer timestamps (might want to fix this in the future to use our Time
    // objects everywhere instead).
    const startTimestamp = timeToTimestamp(start);
    const endTimestamp = timeToTimestamp(end);

    // Split each topic into its constituent parts. E.g. "/my_topic/3d_history" becomes:
    // baseTopic: "/my_topic"
    // topicSuffix: "3d_history"
    // fullTopic: "/my_topic/3d_history"
    const parsedTopics = (subscriptions.rosBinaryMessages || []).map((topic) => {
      const splitTopic = topic.split("/");
      return { baseTopic: `/${splitTopic[1]}`, topicSuffix: splitTopic[2], fullTopic: topic };
    });

    const messages = []; // We'll collect the messages here.

    // Get all the base files in parallel.
    const fileDataByBaseTopic = {};
    const fileDataPromises = [];
    for (const baseTopic of uniq(parsedTopics.map((parsedTopic) => parsedTopic.baseTopic))) {
      fileDataPromises.push(this._getFile(baseTopic).then((fileData) => (fileDataByBaseTopic[baseTopic] = fileData)));
    }
    await Promise.all(fileDataPromises);

    // Iterate through all the parsed topics, and generate messages.
    for (const { fullTopic, baseTopic, topicSuffix } of parsedTopics) {
      // If we want 3d history, then just generate a single marker message once, cache it, and then
      // just repeat it every few hundred milliseconds within the time range that was requested.
      if (topicSuffix === "3d_history") {
        this._historyTopicMessageCache[baseTopic] =
          this._historyTopicMessageCache[baseTopic] ||
          (await this._historyTopicGeneratorByType[this._typeInfoByTopic[baseTopic].messageType](baseTopic));

        for (
          let receiveTime = start;
          TimeUtil.isGreaterThan(end, receiveTime);
          receiveTime = TimeUtil.add(receiveTime, { sec: 0, nsec: 0.4e9 }) // 400ms
        ) {
          messages.push({
            topic: fullTopic,
            receiveTime,
            message: this._historyTopicMessageCache[baseTopic].slice(0),
          });
        }
        continue;
      }

      // If we want a 3d marker, then just generate all the 3d marker messages once, cache that,
      // and then select the messages from the range that were requested.
      if (topicSuffix === "3d_marker") {
        this._3dTopicMessageCache[baseTopic] =
          this._3dTopicMessageCache[baseTopic] ||
          (await this._3dTopicGeneratorByType[this._typeInfoByTopic[baseTopic].messageType](baseTopic));

        const timestamps = this._3dTopicMessageCache[baseTopic];
        // Some fudge factor + manual checking, since timestamps are 32-bit and not always accurately
        // represented in Javascript. TODO(JP): use our Time objects instead.
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

      // Otherwise, select the appropriate timestamp frequency (raw, 2hz, or 10s), and just return
      // the messages that were requested.
      const { buffer } = fileDataByBaseTopic[baseTopic];
      const timestamps =
        topicSuffix === "10s"
          ? fileDataByBaseTopic[baseTopic].timestamps10s
          : topicSuffix === "2hz"
          ? fileDataByBaseTopic[baseTopic].timestamps2hz
          : fileDataByBaseTopic[baseTopic].timestamps;
      // Some fudge factor + manual checking, since timestamps are 32-bit and not always accurately
      // represented in Javascript. TODO(JP): use our Time objects instead.
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

    // We're supposed to return the messages sorted.
    messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime));
    return { rosBinaryMessages: messages, parsedMessages: undefined, bobjects: undefined };
  }

  async close(): Promise<void> {}

  // Read a single file and return a buffer with everything converted to little-endian (for ROS),
  // and a few lists of timestamps.
  async _getFile(baseTopic: string): Promise<FileData> {
    const filename = this._filenameByTopic[baseTopic];
    // Skip if we've already cached this file.
    if (!this._dataByFilename[filename]) {
      // $FlowFixMe
      let buffer = await this._filesByName[filename].arrayBuffer();

      // If it's a gzipped log file, then first decompress it.
      if (filename.toLowerCase().endsWith(".log.gz")) {
        const decoded = self.wasm_bindgen.gzip_decode_raw(new Uint8Array(buffer));
        buffer = decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength);
      }

      // In one go, do a few different things:
      // 1. Make sure that all the ITC_IDs are the same, since we can't handle heterogeneous LOG
      //    files currently.
      // 2. Convert the messages from big (ITC) to little (ROS) endian.
      // 3. Extract the "timestamp" fields.
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

      // Generate downsampled versions of the timestamps.
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
