// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { fromPairs, difference } from "lodash";
import { parseMessageDefinition, type RosMsgDefinition } from "rosbag";

import sendNotification from "webviz-core/src/util/sendNotification";
import Storage, { type BackingStore } from "webviz-core/src/util/Storage";
import { inWebWorker } from "webviz-core/src/util/workers";

export const STORAGE_ITEM_KEY_PREFIX = "msgdefn/";

// MD5s and string message definitions do not unambiguously specify a parsed message defintion.
// Each needs a top-level type name to disambiguate relative type names.
export const getHashKey = (typeName: string, md5Sum: string) => `${typeName}\n${md5Sum}`;
const getStringKey = (messageDefinition: string, typeName: string) => `${typeName}\n${messageDefinition}`;

export function bustAllMessageDefinitionCache(backingStore: BackingStore, keys: string[]) {
  keys.forEach((key) => {
    if (key.startsWith(STORAGE_ITEM_KEY_PREFIX)) {
      backingStore.removeItem(key);
    }
  });
}

class ParseMessageDefinitionCache {
  _storage: Storage;
  // The md5 sums for message definitions that we've seen so far in this run.
  // Used because we may load extraneous definitions that we need to clear.
  _usedHashKeys = new Set<string>();
  _stringKeysToParsedDefinitions: { [string]: RosMsgDefinition[] } = {};
  _storedHashKeysToParsedDefinitions: { [string]: RosMsgDefinition[] } = {};
  _hashKeysToParsedDefinitions: { [string]: RosMsgDefinition[] } = {};
  _localStorageCacheDisabled = false;

  constructor(storage: Storage = new Storage()) {
    this._storage = storage;
    // Register the bust function once so that when localStorage is running out, the
    // message definition cache can be busted.
    this._storage.registerBustStorageFn(bustAllMessageDefinitionCache);

    const hashesToParsedDefinitionsEntries = this._storage
      .keys()
      .filter((key) => key.startsWith(STORAGE_ITEM_KEY_PREFIX))
      .map((key) => [key.substring(STORAGE_ITEM_KEY_PREFIX.length), this._storage.getItem(key)]);
    // $FlowFixMe getItem returns RosMsgDefinition[] type.
    this._storedHashKeysToParsedDefinitions = fromPairs(hashesToParsedDefinitionsEntries);
  }

  _maybeWriteLocalStorageCache(
    hashKey: string,
    newValue: RosMsgDefinition[],
    allStoredHashKeys: string[],
    usedHashKeys: string[]
  ): void {
    const bustUnusedMessageDefinition = (usedStorage) => {
      // Keep all localStorage entries that aren't parsed message definitions.
      const itemsToRemove = difference(allStoredHashKeys, usedHashKeys);
      itemsToRemove.forEach((keyToRemove) => {
        usedStorage.removeItem(`${STORAGE_ITEM_KEY_PREFIX}${keyToRemove}`);
      });
    };
    const newKey = `${STORAGE_ITEM_KEY_PREFIX}${hashKey}`;
    this._storage.setItem(newKey, newValue, bustUnusedMessageDefinition);
  }

  parseMessageDefinition(messageDefinition: string, typeName: string, md5Sum: ?string): RosMsgDefinition[] {
    // What if we already have this message definition stored?
    if (md5Sum) {
      const storedDefinition = this.getStoredDefinition(md5Sum, typeName);
      if (storedDefinition != null) {
        return storedDefinition;
      }
    }

    const hashKey = md5Sum && getHashKey(typeName, md5Sum);
    // If we don't have it stored, we have to parse it.
    const stringKey = getStringKey(messageDefinition, typeName);
    const parsedDefinition =
      this._stringKeysToParsedDefinitions[stringKey] || parseMessageDefinition(messageDefinition, typeName);
    this._stringKeysToParsedDefinitions[stringKey] = parsedDefinition;
    if (hashKey) {
      this._hashKeysToParsedDefinitions[hashKey] = parsedDefinition;
      if (!this._localStorageCacheDisabled) {
        this._storedHashKeysToParsedDefinitions[hashKey] = parsedDefinition;
        try {
          this._maybeWriteLocalStorageCache(
            hashKey,
            parsedDefinition,
            Object.keys(this._storedHashKeysToParsedDefinitions),
            [...this._usedHashKeys]
          );
        } catch (e) {
          sendNotification("Unable to save message definition to localStorage", e, "user", "warn");
          this._localStorageCacheDisabled = true;
        }
      }
    }
    return parsedDefinition;
  }

  getStoredDefinition(md5Sum: string, typeName: string): ?(RosMsgDefinition[]) {
    const hashKey = md5Sum && getHashKey(typeName, md5Sum);
    this._usedHashKeys.add(hashKey);

    if (this._hashKeysToParsedDefinitions[hashKey]) {
      return this._hashKeysToParsedDefinitions[hashKey];
    }
    if (this._storedHashKeysToParsedDefinitions[hashKey]) {
      const parsedDefinition = this._storedHashKeysToParsedDefinitions[hashKey];
      this._hashKeysToParsedDefinitions[hashKey] = parsedDefinition;
      return parsedDefinition;
    }
  }

  getHashKeysForStoredDefinitions(): string[] {
    if (this._localStorageCacheDisabled) {
      return [];
    }
    return Object.keys(this._storedHashKeysToParsedDefinitions);
  }

  getStorageForTest() {
    return this._storage;
  }
}

export const CacheForTesting = ParseMessageDefinitionCache;

// We use this as a singleton - don't expose it in workers.
const cacheSingleton = inWebWorker() ? (undefined: any) : new ParseMessageDefinitionCache();

export default cacheSingleton;
