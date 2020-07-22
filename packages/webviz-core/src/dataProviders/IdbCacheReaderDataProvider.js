// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import microMemoize from "micro-memoize";
import { Time } from "rosbag";

import { MESSAGES_STORE_NAME, getIdbCacheDataProviderDatabase, TIMESTAMP_INDEX } from "./IdbCacheDataProviderDatabase";
import { type DataProvider, type InitializationResult } from "./types";
import type { DataProviderDescriptor, ExtensionPoint, GetDataProvider } from "webviz-core/src/dataProviders/types";
import type { Message, Progress } from "webviz-core/src/players/types";
import Database from "webviz-core/src/util/indexeddb/Database";
import { type Range, deepIntersect, isRangeCoveredByRanges } from "webviz-core/src/util/ranges";
import { subtractTimes, toNanoSec } from "webviz-core/src/util/time";

// Can take a few ms, so worth memoizing.
const deeplyIntersectedTopics = microMemoize((topics, rangesByTopic) => {
  return deepIntersect(topics.map((topic) => rangesByTopic[topic] || []));
});

// This reads from an IndexedDB (Idb) database, which gets populated by an
// `IdbCacheWriterDataProvider` (which has to be used below this provider). The writer communicates
// with the reader in two ways:
// 1. The writer calls `progressCallback` with `nsTimeRangesSinceBagStart`, which the reader uses
//    to look up which ranges have been covered for which topics.
// 2. If a range is not covered, the reader calls `getMessages` for the range it requires, so that
//    the writer can focus on filling data for that range. The writer will resolve the `getMessages`
//    promise without any messages, so we'll still read directly from IndexedDB when it resolves.
// The `IdbCacheWriterDataProvider` is typically put below a WorkerDataProvider so that it can do
// all the downloading, processing, and writing without blocking the main thread. For more details
// on how stuff is stored in IndexedDB, see IdbCacheWriterDataProvider.js and
// IdbCacheDataProviderDatabase.js.
export default class IdbCacheReaderDataProvider implements DataProvider {
  _id: string;
  _provider: DataProvider;
  _db: Database;
  _startTime: Time;
  _rangesByTopic: { [string]: Range[] } = {};

  constructor({ id }: {| id: string |}, children: DataProviderDescriptor[], getDataProvider: GetDataProvider) {
    this._id = id;
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to IdbCacheReaderDataProvider: ${children.length}`);
    }
    this._provider = getDataProvider(children[0]);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this._db = await getIdbCacheDataProviderDatabase(this._id);
    const result = await this._provider.initialize({
      ...extensionPoint,
      progressCallback: (progress: Progress) => {
        if (!progress.nsTimeRangesSinceBagStart) {
          throw new Error(
            "IdbCacheReaderDataProvider error: underlying provider should give nsTimeRangesSinceBagStart"
          );
        }
        this._rangesByTopic = progress.nsTimeRangesSinceBagStart;
        extensionPoint.progressCallback(progress);
      },
    });
    this._startTime = result.start;
    return result;
  }

  async getMessages(startTime: Time, endTime: Time, topics: string[]): Promise<Message[]> {
    const range = {
      start: toNanoSec(subtractTimes(startTime, this._startTime)),
      end: toNanoSec(subtractTimes(endTime, this._startTime)) + 1, // `Range` is defined with `end` being exclusive.
    };
    if (!isRangeCoveredByRanges(range, deeplyIntersectedTopics(topics, this._rangesByTopic))) {
      // We use the child's `getMessages` promise to signal that the data is available in the database,
      // but we don't expect it to return actual messages.
      const getMessagesResult = await this._provider.getMessages(startTime, endTime, topics);
      if (getMessagesResult.length) {
        throw new Error(
          "IdbCacheReaderDataProvider should not be receiving messages from child; be sure to use a IdbCacheWriterDataProvider below"
        );
      }
    } else {
      // If we did find the range, *still* call `getMessages` so we signal to the `IdbCacheWriterDataProvider`
      // which part of the bag we care about. (Specifically this is for if you subscribe to a new topic while playback
      // is paused, the writer needs to know where we have last been reading in order to start buffering there.)
      this._provider.getMessages(startTime, endTime, topics);
    }

    const tx = this._db.transaction(MESSAGES_STORE_NAME);
    const store = tx.objectStore(MESSAGES_STORE_NAME);
    const messagePromises = [];
    // We use a cursor for just the keys, since we don't want to fetch the actual message if the
    // topic doesn't match, since that can be slow.
    store.index(TIMESTAMP_INDEX).iterateKeyCursor(IDBKeyRange.bound(range.start, range.end - 1), (cursor) => {
      if (!cursor) {
        return;
      }
      // Primary key is "timestamp|||arbitrary index|||topic".
      const topic = cursor.primaryKey.split("|||")[2];
      if (topics.includes(topic)) {
        messagePromises.push(store.get(cursor.primaryKey));
      }
      cursor.continue();
    });
    await tx.complete;
    // messagePromises will only be filled after `tx.complete`, so await for `tx.complete` first.
    return (await Promise.all(messagePromises)).map(({ message }) => message);
  }

  close(): Promise<void> {
    this._db.close();
    return this._provider.close();
  }
}
