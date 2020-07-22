// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Bzip2 from "compressjs/lib/Bzip2";
import { debounce, isEqual } from "lodash";
import Bag, { open, Time, BagReader, TimeUtil } from "rosbag";
import decompress from "wasm-lz4";

import BrowserHttpReader from "webviz-core/src/dataProviders/BrowserHttpReader";
import type {
  DataProvider,
  DataProviderDescriptor,
  Connection,
  ExtensionPoint,
  InitializationResult,
  PerformanceMetadata,
} from "webviz-core/src/dataProviders/types";
import type { Message } from "webviz-core/src/players/types";
import { bagConnectionsToDatatypes, bagConnectionsToTopics } from "webviz-core/src/util/bagConnectionsHelper";
import { getBagChunksOverlapCount } from "webviz-core/src/util/bags";
import CachedFilelike from "webviz-core/src/util/CachedFilelike";
import Logger from "webviz-core/src/util/Logger";
import sendNotification from "webviz-core/src/util/sendNotification";
import { fromMillis, subtractTimes } from "webviz-core/src/util/time";

type BagPath = { type: "file", file: File | string } | { type: "remoteBagUrl", url: string };

type Options = {| bagPath: BagPath, cacheSizeInBytes?: ?number |};

const log = new Logger(__filename);

function reportMalformedError(operation: string, error: Error): void {
  sendNotification(
    `Error during ${operation}`,
    `An error was encountered during ${operation}. This usually happens if the bag is somehow malformed.\n\n${
      error.stack
    }`,
    "user",
    "error"
  );
}

type TimedPerformanceMetadata = {|
  startTime: Time,
  endTime: Time,
  data: PerformanceMetadata,
|};
export const statsAreAdjacent = (a: TimedPerformanceMetadata, b: TimedPerformanceMetadata): boolean => {
  return (
    isEqual(a.data.topics, b.data.topics) &&
    a.data.inputSource === b.data.inputSource &&
    a.data.inputType === b.data.inputType &&
    isEqual(TimeUtil.add(a.endTime, { sec: 0, nsec: 1 }), b.startTime)
  );
};
export const mergeStats = (a: TimedPerformanceMetadata, b: TimedPerformanceMetadata): TimedPerformanceMetadata => ({
  startTime: a.startTime,
  endTime: b.endTime,
  data: {
    // Don't spread here, we need to update this function if we add fields.
    inputSource: a.data.inputSource,
    inputType: a.data.inputType,
    topics: a.data.topics,
    type: a.data.type,
    totalSizeOfMessages: a.data.totalSizeOfMessages + b.data.totalSizeOfMessages,
    numberOfMessages: a.data.numberOfMessages + b.data.numberOfMessages,
    receivedRangeDuration: TimeUtil.add(a.data.receivedRangeDuration, b.data.receivedRangeDuration),
    requestedRangeDuration: TimeUtil.add(a.data.requestedRangeDuration, b.data.requestedRangeDuration),
    totalTransferTime: TimeUtil.add(a.data.totalTransferTime, b.data.totalTransferTime),
  },
});

// Read from a ROS Bag. `bagPath` can either represent a local file, or a remote bag. See
// `BrowserHttpReader` for how to set up a remote server to be able to directly stream from it.
// Returns raw messages that still need to be parsed by `ParseMessagesDataProvider`.
export default class BagDataProvider implements DataProvider {
  _options: Options;
  _bag: Bag;
  _lastPerformanceStatsToLog: ?TimedPerformanceMetadata;
  _extensionPoint: ?ExtensionPoint;

  constructor(options: Options, children: DataProviderDescriptor[]) {
    if (children.length > 0) {
      throw new Error("BagDataProvider cannot have children");
    }
    this._options = options;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this._extensionPoint = extensionPoint;
    const { bagPath, cacheSizeInBytes } = this._options;
    await decompress.isLoaded;

    if (bagPath.type === "remoteBagUrl") {
      const fileReader = new BrowserHttpReader(bagPath.url);
      const remoteReader = new CachedFilelike({
        fileReader,
        cacheSizeInBytes: cacheSizeInBytes || 1024 * 1024 * 200, // 200MiB
        logFn: (message) => {
          log.info(`CachedFilelike: ${message}`);
        },
        keepReconnectingCallback: (reconnecting: boolean) => {
          extensionPoint.reportMetadataCallback({
            type: "updateReconnecting",
            reconnecting,
          });
        },
      });
      await remoteReader.open(); // Important that we call this first, because it might throw an error if the file can't be read.
      if (remoteReader.size() === 0) {
        sendNotification("Cannot play invalid bag", "Bag is 0 bytes in size.", "user", "error");
        return new Promise(() => {}); // Just never finish initializing.
      }

      this._bag = new Bag(new BagReader(remoteReader));
      await this._bag.open();
    } else {
      this._bag = await open(bagPath.file);
    }

    const { startTime, endTime, chunkInfos } = this._bag;
    const connections: Connection[] = [];
    const emptyConnections: any[] = [];
    for (const connection: any of Object.values(this._bag.connections)) {
      const { messageDefinition, md5sum, topic, type } = connection;
      if (messageDefinition && md5sum && topic && type) {
        connections.push({ messageDefinition, md5sum, topic, type });
      } else {
        emptyConnections.push(connection);
      }
    }
    if (emptyConnections.length > 0) {
      // TODO(JP): Actually support empty message definitions (e.g. "std_msgs/Empty"). For that we
      // ideally need an actual use case, and then we need to make sure that we don't naively do
      // `if (messageDefinition)` in a bunch of places.
      sendNotification(
        "Empty connections found",
        `This bag has some empty connections, which Webviz does not currently support. We'll try to play the remaining topics. Details:\n\n${JSON.stringify(
          emptyConnections
        )}`,
        "user",
        "warn"
      );
    }

    if (!startTime || !endTime || !connections.length) {
      // This will abort video generation:
      sendNotification("Cannot play invalid bag", "Bag is empty or corrupt.", "user", "error");
      return new Promise(() => {}); // Just never finish initializing.
    }
    const chunksOverlapCount = getBagChunksOverlapCount(chunkInfos);
    // If >25% of the chunks overlap, show a warning. It's common for a small number of chunks to overlap
    // since it looks like `rosbag record` has a bit of a race condition, and that's not too terrible, so
    // only warn when there's a more serious slowdown.
    if (chunksOverlapCount > chunkInfos.length * 0.25) {
      sendNotification(
        "Bag is unsorted, which is slow",
        `This bag has many overlapping chunks (${chunksOverlapCount} out of ${
          chunkInfos.length
        }), which means that we have to decompress many chunks in order to load a particular time range. This is slow. Ideally, fix this where you're generating your bags, by sorting the messages by receive time, e.g. using a script like this: https://gist.github.com/janpaul123/deaa92338d5e8309ef7aa7a55d625152`,
        "user",
        "warn"
      );
    }

    const messageDefinitionsByTopic = {};
    for (const connection of connections) {
      messageDefinitionsByTopic[connection.topic] = connection.messageDefinition;
    }

    return {
      start: startTime,
      end: endTime,
      topics: bagConnectionsToTopics(connections, chunkInfos),
      datatypes: bagConnectionsToDatatypes(connections),
      messageDefinitionsByTopic,
      providesParsedMessages: false,
    };
  }

  _logStats() {
    if (this._extensionPoint == null || this._lastPerformanceStatsToLog == null) {
      return;
    }
    this._extensionPoint.reportMetadataCallback(this._lastPerformanceStatsToLog.data);
    this._lastPerformanceStatsToLog = undefined;
  }

  // Logs some stats if it has been more than a second since the last call.
  _debouncedLogStats = debounce(this._logStats, 1000, { leading: false, trailing: true });

  _queueStats(stats: TimedPerformanceMetadata) {
    if (this._lastPerformanceStatsToLog != null && statsAreAdjacent(this._lastPerformanceStatsToLog, stats)) {
      // The common case: The next bit of data will be next to the last one. For remote bags we'll
      // reuse the connection.
      this._lastPerformanceStatsToLog = mergeStats(this._lastPerformanceStatsToLog, stats);
    } else {
      // For the initial load, or after a seek, a fresh connectionwill be made for remote bags.
      // Eagerly log any stats we know are "done".
      this._logStats();
      this._lastPerformanceStatsToLog = stats;
    }
    // Kick the can down the road whether it's new or existing.
    this._debouncedLogStats();
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<Message[]> {
    const connectionStart = fromMillis(new Date().getTime());
    let totalSizeOfMessages = 0;
    let numberOfMessages = 0;
    const messages: Message[] = [];
    const onMessage = (msg) => {
      const { data, topic, timestamp } = msg;
      messages.push({
        topic,
        receiveTime: timestamp,
        message: data.buffer.slice(data.byteOffset, data.byteOffset + data.length),
      });
      totalSizeOfMessages += data.length;
      numberOfMessages += 1;
    };
    const options = {
      topics,
      startTime: start,
      endTime: end,
      noParse: true,
      decompress: {
        bz2: (...args) => {
          try {
            return Buffer.from(Bzip2.decompressFile(...args));
          } catch (error) {
            reportMalformedError("bz2 decompression", error);
            throw error;
          }
        },
        lz4: (...args) => {
          try {
            return decompress(...args);
          } catch (error) {
            reportMalformedError("lz4 decompression", error);
            throw error;
          }
        },
      },
    };
    try {
      await this._bag.readMessages(options, onMessage);
    } catch (error) {
      reportMalformedError("bag parsing", error);
      throw error;
    }
    messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime));
    // Range end is inclusive.
    const duration = TimeUtil.add(subtractTimes(end, start), { sec: 0, nsec: 1 });
    this._queueStats({
      startTime: start,
      endTime: end,
      data: {
        type: "performance",
        inputSource: "other",
        inputType: this._options.bagPath.type === "file" ? "bag" : "remoteBag",
        totalSizeOfMessages,
        numberOfMessages,
        // Note: Requested durations are wrong by a nanosecond -- ranges are inclusive.
        requestedRangeDuration: duration,
        receivedRangeDuration: duration,
        topics,
        totalTransferTime: subtractTimes(fromMillis(new Date().getTime()), connectionStart),
      },
    });
    return messages;
  }

  async close(): Promise<void> {}
}
