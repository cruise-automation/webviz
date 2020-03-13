// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortBy } from "lodash";
import { type Time, MessageReader } from "rosbag";

import { type DataProvider, type DataProviderMessage, type InitializationResult, type ExtensionPoint } from "./types";
import type { DataProviderDescriptor, GetDataProvider } from "webviz-core/src/dataProviders/types";
import filterMap from "webviz-core/src/filterMap";
import reportError from "webviz-core/src/util/reportError";

const CACHE_SIZE_DECISECONDS = 50; // Number of deciseconds (1/10th of a second) that we keep cached.

// Parses raw messages as returned by `BagDataProvider`. To make it fast to seek back and forth, we keep
// a small cache here, which maps messages from the underlying DataProvider to parsed messages. This assumes
// that usually the underlying DataProvider will give us the same message references, and fast, which should
// be the case when using the MemoryCacheDataProvider.
export default class ParseMessagesDataProvider implements DataProvider {
  // Underlying DataProvider.
  _provider: DataProvider;

  // Reader per topic, as generated from the underlying DataProvider's `initialize` function.
  _readersByTopic: { [topic: string]: MessageReader } = {};

  // Simple LRU cache that maps raw messages to parsed messages. Uses strings like "123.4" as the cache keys.
  _cachesByDeciSecond: {
    [deciSecond: string]: { map: WeakMap<DataProviderMessage, DataProviderMessage>, lastAccessTime: number },
  } = {};

  // A number that increases on every access; for use in `lastAccessTime`.
  _cacheAccessIndex: number = 1;

  constructor(_: {}, children: DataProviderDescriptor[], getDataProvider: GetDataProvider) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to ParseMessagesDataProvider: ${children.length}`);
    }
    this._provider = getDataProvider(children[0]);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const { messageDefintionsByTopic, ...otherResults } = await this._provider.initialize(extensionPoint);
    if (!messageDefintionsByTopic) {
      throw new Error(
        "ParseMessagesDataProvider can only be used with a provider that produces `messageDefintionsByTopic`"
      );
    }
    this._readersByTopic = {};
    for (const topic of Object.keys(messageDefintionsByTopic)) {
      this._readersByTopic[topic] = new MessageReader(messageDefintionsByTopic[topic]);
    }
    return { ...otherResults };
  }

  _readMessage = (message: DataProviderMessage): ?DataProviderMessage => {
    const reader = this._readersByTopic[message.topic];
    if (!reader) {
      throw new Error("Could not find connection in bag for message");
    }
    try {
      return { ...message, message: reader.readMessage(Buffer.from(message.message)) };
    } catch (error) {
      reportError(`Error reading messages from ${message.topic}: ${error.message}`, error, "user");
      return undefined;
    }
  };

  async getMessages(start: Time, end: Time, topics: string[]): Promise<DataProviderMessage[]> {
    const allMessages = await this._provider.getMessages(start, end, topics);

    const outputMessages = filterMap(allMessages, (message) => {
      // Use strings like "123.4" as the cache keys.
      const deciSecond = `${message.receiveTime.sec}.${message.receiveTime.nsec.toString().slice(0, 1)}`;

      // Initialize the cache.
      this._cachesByDeciSecond[deciSecond] = this._cachesByDeciSecond[deciSecond] || {
        map: new WeakMap(),
        lastAccessTime: 0,
      };

      // Update the access time.
      this._cachesByDeciSecond[deciSecond].lastAccessTime = this._cacheAccessIndex++;

      let outputMessage = this._cachesByDeciSecond[deciSecond].map.get(message);
      if (!outputMessage) {
        outputMessage = this._readMessage(message);
        if (outputMessage) {
          this._cachesByDeciSecond[deciSecond].map.set(message, outputMessage);
        }
      }

      return outputMessage;
    });

    // If we have too many caches, delete the least recently used ones.
    const cacheEntries = Object.entries(this._cachesByDeciSecond);
    if (cacheEntries.length > CACHE_SIZE_DECISECONDS) {
      // $FlowFixMe - Object.entries doesn't behave well in Flow.
      const sortedCaches = sortBy(cacheEntries, (val) => val[1].lastAccessTime);
      for (const [oldDeciSecond] of sortedCaches.slice(0, sortedCaches.length - CACHE_SIZE_DECISECONDS)) {
        delete this._cachesByDeciSecond[oldDeciSecond];
      }
    }
    return outputMessages;
  }

  close(): Promise<void> {
    return this._provider.close();
  }
}
