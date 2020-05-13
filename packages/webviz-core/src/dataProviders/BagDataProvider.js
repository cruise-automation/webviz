// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Bzip2 from "compressjs/lib/Bzip2";
import Bag, { open, Time, BagReader, TimeUtil } from "rosbag";
import decompress from "wasm-lz4";

import BrowserHttpReader from "webviz-core/src/dataProviders/BrowserHttpReader";
import type {
  DataProvider,
  DataProviderDescriptor,
  Connection,
  ExtensionPoint,
  InitializationResult,
  DataProviderMessage,
} from "webviz-core/src/dataProviders/types";
import { bagConnectionsToDatatypes, bagConnectionsToTopics } from "webviz-core/src/util/bagConnectionsHelper";
import { getBagChunksOverlapCount } from "webviz-core/src/util/bags";
import CachedFilelike from "webviz-core/src/util/CachedFilelike";
import Logger from "webviz-core/src/util/Logger";
import type { Range } from "webviz-core/src/util/ranges";
import sendNotification from "webviz-core/src/util/sendNotification";

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

// Read from a ROS Bag. `bagPath` can either represent a local file, or a remote bag. See
// `BrowserHttpReader` for how to set up a remote server to be able to directly stream from it.
// Returns raw messages that still need to be parsed by `ParseMessagesDataProvider`.
export default class BagDataProvider implements DataProvider {
  _options: Options;
  _bag: Bag;

  constructor(options: Options, children: DataProviderDescriptor[]) {
    if (children.length > 0) {
      throw new Error("BagDataProvider cannot have children");
    }
    this._options = options;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const { bagPath, cacheSizeInBytes } = this._options;
    await decompress.isLoaded;

    if (bagPath.type === "remoteBagUrl") {
      extensionPoint.progressCallback({ fullyLoadedFractionRanges: [] });
      let approximateSize = 0;
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
        rangesCallback: (ranges: Range[]) => {
          if (approximateSize) {
            extensionPoint.progressCallback({
              fullyLoadedFractionRanges: ranges.map(({ start, end }) => ({
                start: Math.max(0, start / approximateSize),
                end: Math.min(1, end / approximateSize),
              })),
            });
          }
        },
      });
      await remoteReader.open(); // Important that we call this first, because it might throw an error if the file can't be read.
      approximateSize = remoteReader.size() * 0.99; // Chop off the last percentage or so for the indexes.

      this._bag = new Bag(new BagReader(remoteReader));
      await this._bag.open();
    } else {
      this._bag = await open(bagPath.file);
      extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 1 }] });
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
      topics: bagConnectionsToTopics(connections),
      datatypes: bagConnectionsToDatatypes(connections),
      messageDefinitionsByTopic,
      providesParsedMessages: false,
    };
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<DataProviderMessage[]> {
    const messages: DataProviderMessage[] = [];
    const onMessage = (msg) => {
      const { data, topic, timestamp } = msg;
      messages.push({
        topic,
        receiveTime: timestamp,
        message: data.buffer.slice(data.byteOffset, data.byteOffset + data.length),
      });
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
    return messages;
  }

  async close(): Promise<void> {}
}
