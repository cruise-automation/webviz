// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { fromPairs, difference } from "lodash";
import { parseMessageDefinition, type RosMsgDefinition } from "rosbag";

import MemoryStorage from "webviz-core/src/test/MemoryStorage";
import sendNotification from "webviz-core/src/util/sendNotification";
import Storage, { type BackingStore } from "webviz-core/src/util/Storage";
import { inWebWorker } from "webviz-core/src/util/workers";

export const STORAGE_ITEM_KEY_PREFIX = "msgdefn/";

let storage = new Storage();

export function bustAllMessageDefinitionCache(backingStore: BackingStore, keys: string[]) {
  keys.forEach((key) => {
    if (key.startsWith(STORAGE_ITEM_KEY_PREFIX)) {
      backingStore.removeItem(key);
    }
  });
}

// Register the bust function once so that when localStorage is running out, the
// message definition cache can be busted.
storage.registerBustStorageFn(bustAllMessageDefinitionCache);

export const setStorageForTest = (quota?: number) => {
  storage = new Storage(new MemoryStorage(quota));
  storage.registerBustStorageFn(bustAllMessageDefinitionCache);
};
export const restoreStorageForTest = () => {
  storage = new Storage();
};

export const getStorageForTest = () => storage;

function maybeWriteLocalStorageCache(
  md5Sum: string,
  newValue: RosMsgDefinition[],
  allStoredMd5Sums: string[],
  usedmd5Sums: string[]
): void {
  const newKey = `${STORAGE_ITEM_KEY_PREFIX}${md5Sum}`;
  const bustUnusedMessageDefinition = (usedStorage) => {
    // Keep all localStorage entries that aren't parsed message definitions.
    const itemsToRemove = difference(allStoredMd5Sums, usedmd5Sums);
    itemsToRemove.forEach((md5ToRemove) => {
      usedStorage.removeItem(`${STORAGE_ITEM_KEY_PREFIX}${md5ToRemove}`);
    });
  };
  storage.setItem(newKey, newValue, bustUnusedMessageDefinition);
}

class ParseMessageDefinitionCache {
  // The md5 sums for message definitions that we've seen so far in this run.
  // Used because we may load extraneous definitions that we need to clear.
  _usedMd5Sums = new Set<string>();
  _stringDefinitionsToParsedDefinitions: { [string]: RosMsgDefinition[] } = {};
  _md5SumsToParsedDefinitions: { [string]: RosMsgDefinition[] } = {};
  _hashesToParsedDefinitions: { [string]: RosMsgDefinition[] } = {};
  _localStorageCacheDisabled = false;

  constructor() {
    const hashesToParsedDefinitionsEntries = storage
      .keys()
      .filter((key) => key.startsWith(STORAGE_ITEM_KEY_PREFIX))
      .map((key) => [key.substring(STORAGE_ITEM_KEY_PREFIX.length), storage.getItem(key)]);
    // $FlowFixMe getItem returns RosMsgDefinition[] type.
    this._md5SumsToParsedDefinitions = fromPairs(hashesToParsedDefinitionsEntries);
  }

  parseMessageDefinition(messageDefinition: string, md5Sum: ?string): RosMsgDefinition[] {
    // What if we already have this message definition stored?
    if (md5Sum) {
      const storedDefinition = this.getStoredDefinition(md5Sum);
      if (storedDefinition != null) {
        return storedDefinition;
      }
    }

    // If we don't have it stored, we have to parse it.
    const parsedDefinition =
      this._stringDefinitionsToParsedDefinitions[messageDefinition] || parseMessageDefinition(messageDefinition);
    this._stringDefinitionsToParsedDefinitions[messageDefinition] = parsedDefinition;
    if (md5Sum) {
      this._hashesToParsedDefinitions[md5Sum] = parsedDefinition;
      if (!this._localStorageCacheDisabled) {
        this._md5SumsToParsedDefinitions[md5Sum] = parsedDefinition;
        try {
          maybeWriteLocalStorageCache(md5Sum, parsedDefinition, Object.keys(this._md5SumsToParsedDefinitions), [
            ...this._usedMd5Sums,
          ]);
        } catch (e) {
          sendNotification("Unable to save message definition to localStorage", e, "user", "warn");
          this._localStorageCacheDisabled = true;
        }
      }
    }
    return parsedDefinition;
  }

  getStoredDefinition(md5Sum: string): ?(RosMsgDefinition[]) {
    this._usedMd5Sums.add(md5Sum);

    if (this._hashesToParsedDefinitions[md5Sum]) {
      return this._hashesToParsedDefinitions[md5Sum];
    }
    if (this._md5SumsToParsedDefinitions[md5Sum]) {
      const parsedDefinition = this._md5SumsToParsedDefinitions[md5Sum];
      this._hashesToParsedDefinitions[md5Sum] = parsedDefinition;
      return parsedDefinition;
    }
  }

  getMd5sForStoredDefinitions(): string[] {
    if (this._localStorageCacheDisabled) {
      return [];
    }
    return Object.keys(this._md5SumsToParsedDefinitions);
  }
}

export const CacheForTesting = ParseMessageDefinitionCache;

// We use this as a singleton - don't expose it in workers.
if (inWebWorker()) {
  throw new Error("Cannot require parseMessageDefinitionCache in a web worker context");
}
export default new ParseMessageDefinitionCache();
