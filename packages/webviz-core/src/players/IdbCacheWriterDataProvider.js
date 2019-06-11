// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { simplify, unify } from "intervals-fn";
import { isEqual, uniq } from "lodash";
import { TimeUtil, type Time } from "rosbag";
import uuid from "uuid";

import {
  MESSAGES_STORE_NAME,
  TIMESTAMP_KEY,
  TOPIC_RANGES_KEY,
  TOPIC_RANGES_STORE_NAME,
  getIdbCacheDataProviderDatabase,
} from "./IdbCacheDataProviderDatabase";
import type {
  ChainableDataProvider,
  ChainableDataProviderDescriptor,
  ExtensionPoint,
  GetDataProvider,
  InitializationResult,
  MessageLike,
} from "webviz-core/src/players/types";
import { getNewConnection } from "webviz-core/src/util/getNewConnection";
import Database from "webviz-core/src/util/indexeddb/Database";
import Logger from "webviz-core/src/util/Logger";
import { type Range, deepIntersect, isRangeCoveredByRanges, missingRanges } from "webviz-core/src/util/ranges";
import { fromNanoSec, subtractTimes, toNanoSec } from "webviz-core/src/util/time";

const log = new Logger(__filename);

export const BLOCK_SIZE_NS = 0.1 * 1e9; // 0.1 seconds.
const CONTINUE_DOWNLOADING_THRESHOLD = 3 * BLOCK_SIZE_NS;

// This writer is a companion to the `IdbCacheReaderDataProvider`. The writer fills up
// IndexedDB (Idb) with messages, and the reader reads them. The writer gets signals from the reader
// in order to download the relevant ranges, in the form of `getMessages` calls. We track ranges
// with nanoseconds since the start of the bag, since `Range` requires normal numbers (it does not
// support `Time`). This also lets us use `getNewConnection`, which contains logic to determine
// which range to download next.
// For more details on how stuff is stored in IndexedDB, see IdbCacheDataProviderDatabase.js.
export default class IdbCacheWriterDataProvider implements ChainableDataProvider {
  _id: string;
  _provider: ChainableDataProvider;
  _db: Database;

  // The start time of the bag. Used for computing from and to nanoseconds since the start.
  _startTime: Time;

  // The topics that we care about. This is always set by the last `getMessages` or topic callback.
  _topics: string[] = [];

  // Total length of the data in nanoseconds. Used to compute progress with.
  _totalNs: number;

  // Which ranges have been covered by which topics. This is stored in IndexedDB as well, but also
  // kept here for easy (non-blocking) access. The ranges are nanosecond offsets since `_startTime`.
  _rangesByTopic: { [string]: Range[] } = {};

  // The current "connection", which represents the range that we're downloading.
  _currentConnection: ?{| id: string, topics: string[], remainingRange: Range |};

  // The read requests we've received via `getMessages`.
  _readRequests: {| range: Range, topics: string[], resolve: (MessageLike[]) => void |}[] = [];

  // The end time of the last callback that we've resolved. This is useful for preloading new data
  // around this time.
  _lastResolvedCallbackEnd: ?number;

  _extensionPoint: ExtensionPoint;

  constructor({ id }: {| id: string |}, children: ChainableDataProviderDescriptor[], getDataProvider: GetDataProvider) {
    this._id = id;
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to IdbCacheReaderDataProvider: ${children.length}`);
    }
    this._provider = getDataProvider(children[0]);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this._extensionPoint = extensionPoint;
    this._db = await getIdbCacheDataProviderDatabase(this._id);
    this._rangesByTopic = (await this._db.get(TOPIC_RANGES_STORE_NAME, TOPIC_RANGES_KEY)) || {};
    this._updateProgress();

    const result = await this._provider.initialize({ ...extensionPoint, progressCallback: () => {} });
    this._startTime = result.start;
    this._totalNs = toNanoSec(subtractTimes(result.end, result.start)) + 1; // +1 since times are inclusive.
    extensionPoint.addTopicsCallback((topics: string[]) => this._updateTopics(topics));
    return result;
  }

  async getMessages(startTime: Time, endTime: Time, topics: string[]): Promise<MessageLike[]> {
    // We might have a new set of topics.
    this._updateTopics(topics);

    // Push a new entry to `this._readRequests`, and call `this._updateState()`.
    const range = {
      start: toNanoSec(subtractTimes(startTime, this._startTime)),
      end: toNanoSec(subtractTimes(endTime, this._startTime)) + 1, // `Range` defines `end` as exclusive.
    };
    return new Promise((resolve) => {
      this._readRequests.push({ range, topics, resolve });
      this._updateState();
    });
  }

  close(): Promise<void> {
    delete this._currentConnection; // Make sure that the current "connection" loop stops executing.
    this._db.close();
    return this._provider.close();
  }

  _updateTopics(topics: string[]) {
    const newTopics = uniq(topics).sort();
    if (!isEqual(this._topics, newTopics)) {
      // If we have a different set of topics, stop the current "connection", and refresh everything.
      delete this._currentConnection;
      this._topics = newTopics;
      this._updateProgress();
      this._updateState();
    }
  }

  // Gets called any time our "connection", read requests, or topics change.
  _updateState() {
    if (this._topics.length === 0) {
      return;
    }

    // First, see if there are any read requests that we can resolve now.
    this._readRequests = this._readRequests.filter(({ range, topics, resolve }) => {
      const downloadedRanges: Range[] = this._getDownloadedRanges(topics);
      if (!isRangeCoveredByRanges(range, downloadedRanges)) {
        return true;
      }
      resolve([]);
      this._lastResolvedCallbackEnd = range.end;
      return false;
    });

    // Then see if we need to set a new connection based on the new connection and read requests state.
    const newConnection = getNewConnection({
      currentRemainingRange: this._currentConnection ? this._currentConnection.remainingRange : undefined,
      readRequestRange: this._readRequests[0] ? this._readRequests[0].range : undefined,
      downloadedRanges: this._getDownloadedRanges(this._topics),
      lastResolvedCallbackEnd: this._lastResolvedCallbackEnd,
      cacheSize: Infinity,
      fileSize: this._totalNs,
      continueDownloadingThreshold: CONTINUE_DOWNLOADING_THRESHOLD,
    });
    if (newConnection) {
      this._setConnection(newConnection).catch((err) => {
        this._extensionPoint.reportMetadataCallback({
          type: "error",
          source: `IdbCacheWriter connection ${this._currentConnection ? this._currentConnection.id : ""}`,
          errorType: "app",
          message: err ? err.message : "<unknown error>",
        });
      });
    }
  }

  // Replace the current connection with a new one, spanning a certain range.
  async _setConnection(range: Range) {
    const id = uuid.v4();
    this._currentConnection = { id, topics: this._topics, remainingRange: range };

    const reportTransactionError = (err) => {
      this._extensionPoint.reportMetadataCallback({
        type: "error",
        source: `IDBTransaction for ${id}`,
        errorType: "app",
        message: err ? err.message : "<unknown error>",
      });
    };

    const isCurrent = () => {
      return this._currentConnection && this._currentConnection.id === id;
    };

    // Just loop infinitely, but break if the connection is not current any more.
    while (true) {
      const currentConnection = this._currentConnection;
      if (!currentConnection || !isCurrent()) {
        return;
      }

      const currentRange = {
        start: currentConnection.remainingRange.start,
        end: Math.min(currentConnection.remainingRange.start + BLOCK_SIZE_NS, range.end),
      };
      const topics = currentConnection.topics.filter((topic) => {
        const missingRangeForTopic = missingRanges(currentRange, this._rangesByTopic[topic] || [])[0];
        if (!missingRangeForTopic) {
          // If the topic has been fully downloaded for `currentRange`, then just filter it out.
          return false;
        } else if (currentRange.start < missingRangeForTopic.start) {
          // If the start of `currentRange` does already cover the topic, then shrink `currentRange`
          // to the point where the topic has been sufficiently covered. In the next iteration we
          // will then download the topic.
          currentRange.end = missingRangeForTopic.start;
          return false;
        } else if (missingRangeForTopic.end < currentRange.end) {
          // If the topic is only missing for part of the range, then also shrink the range to cover
          // just the part that is missing for this topic. In the next iteration we will then
          // exclude this topic.
          currentRange.end = missingRangeForTopic.end;
          return true;
        }
        // Otherwise the topic is missing for the entire range, so include it.
        return true;
      });

      // Get messages from the underlying provider.
      const startTime = TimeUtil.add(this._startTime, fromNanoSec(currentRange.start));
      const endTime = TimeUtil.add(this._startTime, fromNanoSec(currentRange.end - 1)); // endTime is inclusive.
      const messages = await this._provider.getMessages(startTime, endTime, topics);

      // If we're not current any more, discard the messages, because otherwise we might write
      // duplicate messages into IndexedDB.
      if (!isCurrent()) {
        return;
      }

      // Update IndexedDB with the new messages and the new ranges, all in one transaction.
      // We assume that `this._rangesByTopic` is up to date.
      const newRangesByTopic = { ...this._rangesByTopic };
      for (const topic of topics) {
        newRangesByTopic[topic] = simplify(unify([currentRange], newRangesByTopic[topic] || []));
      }
      this._rangesByTopic = newRangesByTopic;
      const tx = this._db.transaction([MESSAGES_STORE_NAME, TOPIC_RANGES_STORE_NAME], "readwrite");
      const messagesStore = tx.objectStore(MESSAGES_STORE_NAME);
      for (const message of messages) {
        if (message.message instanceof ArrayBuffer && message.message.byteLength > 10000000) {
          log.warn(`Message on ${message.topic} is suspiciously large (${message.message.byteLength} bytes)`);
        }
        messagesStore
          .put({
            [TIMESTAMP_KEY]: toNanoSec(subtractTimes(message.receiveTime, this._startTime)),
            message,
          })
          .catch(reportTransactionError);
      }
      tx.objectStore(TOPIC_RANGES_STORE_NAME)
        .put(this._rangesByTopic, TOPIC_RANGES_KEY)
        .catch(reportTransactionError);
      await tx.complete.catch(reportTransactionError);
      this._updateProgress();

      // Check *again* if we're not current any more, because now we're going to update connection
      // information.
      if (!isCurrent()) {
        return;
      }

      if (currentRange.end >= range.end) {
        // If we're at the end of the range, we're done.
        delete this._currentConnection;
        this._updateState();
        return;
      }
      // Otherwise, update the `remainingRange`.
      this._currentConnection = {
        ...this._currentConnection,
        remainingRange: { start: currentRange.end, end: range.end },
      };
      this._updateState();
    }
  }

  _getDownloadedRanges(topics: string[]) {
    return deepIntersect(topics.map((topic) => this._rangesByTopic[topic] || []));
  }

  _updateProgress() {
    this._extensionPoint.progressCallback({
      fullyLoadedFractionRanges: this._getDownloadedRanges(this._topics).map((range) => ({
        start: range.start / this._totalNs,
        end: range.end / this._totalNs,
      })),
      nsTimeRangesSinceBagStart: this._rangesByTopic,
    });
  }
}
