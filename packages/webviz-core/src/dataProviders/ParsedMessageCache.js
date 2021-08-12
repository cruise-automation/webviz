// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortBy } from "lodash";

import filterMap from "webviz-core/src/filterMap";
import type { Message } from "webviz-core/src/players/types";
import { deepParse, inaccurateByteSize, isBobject } from "webviz-core/src/util/binaryObjects";
import { toSec } from "webviz-core/src/util/time";

// Amount of parsed messages measured in unparsed message size that we keep cached.
// Exported for tests.
export const CACHE_SIZE_BYTES = 200e6;

type Cache = {|
  map: WeakMap<Message, Message>,
  lastAccessIndex: number,
  sizeInBytes: number,
|};

export default class ParsedMessageCache {
  // Simple LRU cache that maps raw messages to parsed messages. Uses strings like "123.4" as the cache keys.
  _cachesByDeciSecond: { [deciSecond: number]: Cache } = {};

  // A number that increases on every access; for use in `lastAccessIndex`.
  _cacheAccessIndex: number = 1;

  // Total size in bytes from all the _cachesByDeciSecond.
  _cacheSizeInBytes: number = 0;

  parseMessages(messages: $ReadOnlyArray<Message>): Message[] {
    const outputMessages: Message[] = filterMap(messages, (message) => {
      // Use strings like "123.4" as the cache keys.
      const deciSecond = Math.trunc(toSec(message.receiveTime) * 10);

      // Initialize the cache.
      const cache = (this._cachesByDeciSecond[deciSecond] = this._cachesByDeciSecond[deciSecond] || {
        map: new WeakMap(),
        lastAccessIndex: 0,
        sizeInBytes: 0,
      });

      // Update the access time.
      cache.lastAccessIndex = this._cacheAccessIndex++;

      let outputMessage = cache.map.get(message);
      if (!outputMessage) {
        outputMessage = { ...message, message: deepParse(message.message) };
        if (outputMessage) {
          cache.map.set(message, outputMessage);
          const messageSize = isBobject(message.message)
            ? inaccurateByteSize(message.message)
            : message.message.byteLength;
          cache.sizeInBytes += messageSize;
          this._cacheSizeInBytes += messageSize;
        }
      }

      return outputMessage;
    });

    if (this._cacheSizeInBytes > CACHE_SIZE_BYTES) {
      // Delete the least recently used caches, once they exceed CACHE_SIZE_BYTES.
      const cacheEntries = ((Object.entries(this._cachesByDeciSecond): any): [number, Cache][]);
      const sortedCaches = sortBy(cacheEntries, (val) => -val[1].lastAccessIndex);
      let totalBytes = 0;
      for (const [deciSecond, { sizeInBytes }] of sortedCaches) {
        totalBytes += sizeInBytes;
        if (totalBytes > CACHE_SIZE_BYTES) {
          this._cacheSizeInBytes -= sizeInBytes;
          delete this._cachesByDeciSecond[deciSecond];
        }
      }
    }

    return outputMessages;
  }
}
