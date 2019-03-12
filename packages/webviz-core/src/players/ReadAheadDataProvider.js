// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { intersection } from "lodash";
import { TimeUtil, type Time } from "rosbag";

import {
  type RandomAccessDataProvider,
  type MessageLike,
  type InitializationResult,
  type ExtensionPoint,
} from "./types";
import Logger from "webviz-core/src/util/Logger";
import { fromMillis } from "webviz-core/src/util/time";

const log = new Logger(__filename);
export class ReadResult {
  start: Time;
  end: Time;
  _isEmpty: boolean = false;
  _promise: Promise<MessageLike[]>;
  _isResolved: boolean = false;
  constructor(start: Time, end: Time, promise: Promise<MessageLike[]>) {
    this.start = start;
    this.end = end;
    this._isEmpty = TimeUtil.compare(start, end) === 0;
    this._promise = promise;
    promise.then(() => (this._isResolved = true));
  }

  static empty() {
    return new ReadResult({ sec: 0, nsec: 0 }, { sec: 0, nsec: 0 }, Promise.resolve([]));
  }

  overlaps(start: Time, end: Time) {
    if (this._isEmpty) {
      return false;
    }
    return TimeUtil.compare(this.start, end) < 1 && TimeUtil.compare(this.end, start) > -1;
  }

  async getMessages(start: Time, end: Time): Promise<MessageLike[]> {
    if (!this._isResolved) {
      log.info(
        "reading from cache before cache is loaded - this should not happen too often or playback will be degraded"
      );
    }
    const all = await this._promise;
    return all.filter(
      (msg) => TimeUtil.compare(start, msg.receiveTime) < 1 && TimeUtil.compare(end, msg.receiveTime) > -1
    );
  }
}

const oneNanoSecond = { sec: 0, nsec: 1 };

// a caching adapter for a DataProvider which does eager, non-blocking read ahead of time ranges
// based on a readAheadRange (default to 100 milliseconds)
export default class ReadAheadDataProvider implements RandomAccessDataProvider {
  _provider: RandomAccessDataProvider;
  _topics: string[] = [];
  _readAheadRange: Time;
  _current: ReadResult = ReadResult.empty();
  _next: ReadResult = ReadResult.empty();
  _topics: string[] = [];

  constructor(provider: RandomAccessDataProvider, readAheadRange: Time = fromMillis(100)) {
    this._provider = provider;
    this._readAheadRange = readAheadRange;
  }

  initialize(extensionPoint: ?ExtensionPoint): Promise<InitializationResult> {
    return this._provider.initialize(extensionPoint);
  }

  close(): Promise<void> {
    return this._provider.close();
  }

  _makeReadResult(start: Time, end: Time, topics: string[]): ReadResult {
    return new ReadResult(start, end, this._provider.getMessages(start, end, topics));
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]> {
    // if our topics change we need to clear out the cached ranges, or if we're
    // reading from before the first range.
    if (
      intersection(this._topics, topics).length !== topics.length ||
      TimeUtil.compare(start, this._current.start) < 0
    ) {
      this._topics = topics;
      this._current = ReadResult.empty();
      this._next = ReadResult.empty();
    }
    let messages = [];
    const currentMatches = this._current.overlaps(start, end);
    const nextMatches = this._next.overlaps(start, end);
    if (currentMatches) {
      messages = messages.concat(await this._current.getMessages(start, end));
    }
    if (nextMatches) {
      messages = messages.concat(await this._next.getMessages(start, end));
    }
    if ((!currentMatches && !nextMatches) || TimeUtil.isGreaterThan(end, this._next.end)) {
      let startTime = start;
      if (nextMatches) {
        log.info("readahead cache overrun - consider expanding readAheadRange");
        startTime = TimeUtil.add(this._next.end, oneNanoSecond);
      }
      this._current = this._makeReadResult(startTime, end, topics);
      const nextStart = TimeUtil.add(end, oneNanoSecond);
      this._next = this._makeReadResult(nextStart, TimeUtil.add(nextStart, this._readAheadRange), topics);
      return messages.concat(await this.getMessages(startTime, end, topics));
    }
    if (nextMatches) {
      this._current = this._next;
      const nextStart = TimeUtil.add(this._current.end, oneNanoSecond);
      const nextEnd = TimeUtil.add(nextStart, this._readAheadRange);
      this._next = this._makeReadResult(nextStart, nextEnd, topics);
    }
    return messages;
  }
}
