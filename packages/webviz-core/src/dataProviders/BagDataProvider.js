// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { keyBy } from "lodash";
import Bag, { open, Time, BagReader } from "rosbag";
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
import CachedFilelike from "webviz-core/src/util/CachedFilelike";
import Logger from "webviz-core/src/util/Logger";
import type { Range } from "webviz-core/src/util/ranges";
import reportError from "webviz-core/src/util/reportError";

type BagPath = { type: "file", file: File | string } | { type: "remoteBagUrl", url: string };

type Options = {| bagPath: BagPath, cacheSizeInBytes?: ?number |};

const log = new Logger(__filename);

// Read from a ROS Bag. `bagPath` can either represent a local file, or a remote bag. See
// `BrowserHttpReader` for how to set up a remote server to be able to directly stream from it.
// Returns raw messages that still need to be parsed by `ParseMessagesDataProvider`.
export default class BagDataProvider implements DataProvider {
  _options: Options;
  _bag: Bag;
  _connectionsByTopic: { [topic: string]: Connection } = {};

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

    const { startTime, endTime } = this._bag;
    const connections = ((Object.values(this._bag.connections): any): Connection[]);
    if (!startTime || !endTime || !connections.length) {
      // This will abort video generation:
      reportError("Invalid bag", "Bag is empty or corrupt.", "user");
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
    const options = { topics, startTime: start, endTime: end, noParse: true, decompress: { lz4: decompress } };
    await this._bag.readMessages(options, onMessage);
    return messages;
  }

  async close(): Promise<void> {}
}
