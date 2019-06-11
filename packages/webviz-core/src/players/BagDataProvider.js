// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { keyBy } from "lodash";
import Bag, { open, Time, BagReader } from "rosbag";
import decompress from "wasm-lz4";

import BrowserHttpReader from "webviz-core/src/players/BrowserHttpReader";
import type {
  ChainableDataProvider,
  ChainableDataProviderDescriptor,
  Connection,
  ExtensionPoint,
  InitializationResult,
  MessageLike,
} from "webviz-core/src/players/types";
import { bagConnectionsToDatatypes, bagConnectionsToTopics } from "webviz-core/src/util/bagConnectionsHelper";
import CachedFilelike from "webviz-core/src/util/CachedFilelike";
import Logger from "webviz-core/src/util/Logger";
import type { Range } from "webviz-core/src/util/ranges";

type BagPath = { type: "file", file: File | string } | { type: "remoteBagUrl", url: string };

type Options = {| bagPath: BagPath, cacheSizeInBytes?: ?number |};

const log = new Logger(__filename);

export default class BagDataProvider implements ChainableDataProvider {
  _options: Options;
  _bag: Bag;
  _connectionsByTopic: { [topic: string]: Connection } = {};

  constructor(options: Options, children: ChainableDataProviderDescriptor[]) {
    if (children.length > 0) {
      throw new Error("BagDataProvider cannot have children");
    }
    this._options = options;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const { bagPath, cacheSizeInBytes } = this._options;
    await decompress.isLoaded;

    if (bagPath.type === "remoteBagUrl") {
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
    }

    const { startTime, endTime } = this._bag;
    const connections = ((Object.values(this._bag.connections): any): Connection[]);
    if (!startTime || !endTime || !connections.length) {
      // This will abort video generation:
      extensionPoint.reportMetadataCallback({
        type: "error",
        source: "BagDataProvider",
        errorType: "user",
        message: "Invalid bag: bag is missing basic data.",
      });
      return new Promise(() => {}); // Just never finish initializing.
    }

    this._connectionsByTopic = keyBy(connections, "topic");
    return {
      start: startTime,
      end: endTime,
      topics: bagConnectionsToTopics(connections),
      datatypes: bagConnectionsToDatatypes(connections),
      connectionsByTopic: this._connectionsByTopic,
    };
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]> {
    const messages: MessageLike[] = [];
    const onMessage = (msg) => {
      const { data, topic, timestamp } = msg;
      const connection = this._connectionsByTopic[topic];
      if (!connection) {
        throw new Error("Could not find connection in bag for message");
      }
      messages.push({
        topic,
        datatype: connection.type,
        receiveTime: timestamp,
        message: data.buffer.slice(data.byteOffset, data.byteOffset + data.length),
      });
    };
    const options = { topics, startTime: start, endTime: end, noParse: true, decompress: { lz4: decompress } };
    await this._bag.readMessages(options, onMessage);
    return messages;
  }

  async close(): Promise<void> {}
}
