// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { toPairs, fromPairs, difference } from "lodash";
import { parseMessageDefinition, type RosMsgDefinition } from "rosbag";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { inWebWorker } from "webviz-core/src/util/workers";

const STORAGE_ITEM_KEY_PREFIX = "msgdefn/";

function maybeWriteLocalStorageCache(
  md5Sum: string,
  newValue: string,
  allStoredMd5Sums: string[],
  usedmd5Sums: string[]
): void {
  const { logger, eventNames } = getGlobalHooks().getEventLogger();
  const newKey = `${STORAGE_ITEM_KEY_PREFIX}${md5Sum}`;
  try {
    localStorage.setItem(newKey, newValue);
  } catch {
    // We failed writing to localStorage. Now we should clear all cached storage values and start over.
    logger(eventNames.FAILED_WRITING_LOCALSTORAGE_KEY, {
      definitions_count: allStoredMd5Sums.length,
      definition_length: newValue.length,
    });
    try {
      // Keep all localStorage entries that aren't parsed message definitions.
      const itemsToRemove = difference(allStoredMd5Sums, usedmd5Sums);
      itemsToRemove.forEach((md5ToRemove) => {
        localStorage.removeItem(`${STORAGE_ITEM_KEY_PREFIX}${md5ToRemove}`);
      });
      localStorage.setItem(newKey, newValue);
    } catch (error) {
      // If we fail removing and then re-writing the definition, log it and re-throw it.
      logger(eventNames.FAILED_WRITING_ALL_LOCALSTORAGE_DEFNS, {
        definitions_count: allStoredMd5Sums.length,
        definition_length: newValue.length,
      });
      throw error;
    }
    logger(eventNames.SUCCEEDED_WRITING_ALL_LOCALSTORAGE_DEFNS, {
      definitions_count: allStoredMd5Sums.length,
    });
  }
}

class ParseMessageDefinitionCache {
  // The md5 sums for message definitions that we've seen so far in this run.
  // Used because we may load extraneous definitions that we need to clear.
  _usedMd5Sums = new Set<string>();
  _stringDefinitionsToParsedDefinitions: { [string]: RosMsgDefinition[] } = {};
  _md5SumsToJsonStringifiedParsedDefinitions: { [string]: string } = {};
  _hashesToParsedDefinitions: { [string]: RosMsgDefinition[] } = {};
  _localStorageCacheDisabled = false;

  constructor() {
    const hashesToParsedDefinitionsEntries = toPairs(localStorage)
      .filter(([key]) => key.startsWith(STORAGE_ITEM_KEY_PREFIX))
      .map(([key, value]) => [key.substring(STORAGE_ITEM_KEY_PREFIX.length), value]);
    this._md5SumsToJsonStringifiedParsedDefinitions = fromPairs(hashesToParsedDefinitionsEntries);
  }

  parseMessageDefinition(messageDefinition: string, md5Sum: ?string): RosMsgDefinition[] {
    // What if we already have this message defintion stored?
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
        const stringifiedMsgDefinition = JSON.stringify(parsedDefinition);
        this._md5SumsToJsonStringifiedParsedDefinitions[md5Sum] = stringifiedMsgDefinition;
        try {
          maybeWriteLocalStorageCache(
            md5Sum,
            stringifiedMsgDefinition,
            Object.keys(this._md5SumsToJsonStringifiedParsedDefinitions),
            [...this._usedMd5Sums]
          );
        } catch {
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
    if (this._md5SumsToJsonStringifiedParsedDefinitions[md5Sum]) {
      const parsedDefinition = JSON.parse(this._md5SumsToJsonStringifiedParsedDefinitions[md5Sum]);
      this._hashesToParsedDefinitions[md5Sum] = parsedDefinition;
      return parsedDefinition;
    }
  }

  getMd5sForStoredDefintions(): string[] {
    if (this._localStorageCacheDisabled) {
      return [];
    }
    return Object.keys(this._md5SumsToJsonStringifiedParsedDefinitions);
  }
}

export const CacheForTesting = ParseMessageDefinitionCache;

// We use this as a singleton - don't expose it in workers.
if (inWebWorker()) {
  throw new Error("Cannot require parseMessageDefinitionCache in a web worker context");
}
export default new ParseMessageDefinitionCache();
