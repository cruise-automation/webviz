// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { intersection } from "lodash";
import PromiseQueue from "promise-queue";
import { TimeUtil, type Time } from "rosbag";

import type {
  DataProvider,
  DataProviderDescriptor,
  ExtensionPoint,
  GetDataProvider,
  InitializationResult,
  DataProviderMessage,
} from "webviz-core/src/dataProviders/types";
import Logger from "webviz-core/src/util/Logger";
import { clampTime } from "webviz-core/src/util/time";

const log = new Logger(__filename);

export class ReadResult {
  start: Time;
  end: Time;
  _promise: Promise<DataProviderMessage[]>;
  _isResolved: boolean = false;

  constructor(start: Time, end: Time, promise: Promise<DataProviderMessage[]>) {
    this.start = start;
    this.end = end;
    this._promise = promise;
    promise.then(() => (this._isResolved = true));
  }

  static empty() {
    return new ReadResult({ sec: 0, nsec: 0 }, { sec: 0, nsec: 0 }, Promise.resolve([]));
  }

  overlaps(start: Time, end: Time) {
    return !TimeUtil.isLessThan(end, this.start) && !TimeUtil.isLessThan(this.end, start);
  }

  async getMessages(start: Time, end: Time): Promise<DataProviderMessage[]> {
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
// A caching adapter for a DataProvider which does eager, non-blocking read ahead of time ranges
// based on a readAheadRange (default to 100 milliseconds).
export default class ReadAheadDataProvider implements DataProvider {
  _initResult: InitializationResult;
  _provider: DataProvider;
  _topics: string[] = [];
  _current: ?ReadResult;
  _next: ?ReadResult;
  _topics: string[] = [];
  _readAheadRange: Time;
  _taskQueue = new PromiseQueue(1);

  constructor(
    { readAheadRange }: { readAheadRange?: Time },
    children: DataProviderDescriptor[],
    getDataProvider: GetDataProvider
  ) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to ReadAheadDataProvider: ${children.length}`);
    }
    this._provider = getDataProvider(children[0]);
    this._readAheadRange = readAheadRange || { sec: 0, nsec: 100 * 1e6 };
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const initResult = await this._provider.initialize(extensionPoint);
    this._initResult = initResult;
    return initResult;
  }

  close(): Promise<void> {
    return this._provider.close();
  }

  _makeReadResult(start: Time, end: Time, topics: string[]): ReadResult {
    start = clampTime(start, this._initResult.start, this._initResult.end);
    end = clampTime(end, this._initResult.start, this._initResult.end);
    return new ReadResult(start, end, this._provider.getMessages(start, end, topics));
  }

  getMessages(start: Time, end: Time, topics: string[]): Promise<DataProviderMessage[]> {
    // The implementation of _getMessages() is not reentrant, so wait for all previous calls to return before starting a new one.
    return this._taskQueue.add(() => this._getMessages(start, end, topics));
  }

  async _getMessages(start: Time, end: Time, topics: string[]): Promise<DataProviderMessage[]> {
    // if our topics change we need to clear out the cached ranges, or if we're
    // reading from before the first range.
    if (
      intersection(this._topics, topics).length !== topics.length ||
      !this._current ||
      TimeUtil.isLessThan(start, this._current.start)
    ) {
      this._topics = topics;
      this._current = undefined;
      this._next = undefined;
    }
    let messages = [];
    const currentMatches = this._current && this._current.overlaps(start, end);
    const nextMatches = this._next && this._next.overlaps(start, end);
    if (/*:: this._current && */ currentMatches) {
      messages = messages.concat(await this._current.getMessages(start, end));
    }
    if (/*:: this._next && */ nextMatches) {
      messages = messages.concat(await this._next.getMessages(start, end));
    }
    if ((!currentMatches && !nextMatches) || (this._next && TimeUtil.isGreaterThan(end, this._next.end))) {
      let startTime = start;
      if (/*:: this._next && */ nextMatches) {
        startTime = TimeUtil.add(this._next.end, oneNanoSecond);
        log.info("readahead cache overrun - consider expanding readAheadRange");
      }
      this._current = this._makeReadResult(startTime, end, topics);
      await this._current.getMessages(startTime, end);
      const nextStart = TimeUtil.add(end, oneNanoSecond);
      this._next = this._makeReadResult(nextStart, TimeUtil.add(nextStart, this._readAheadRange), topics);
      messages = messages.concat(await this._getMessages(startTime, end, topics));
    } else if (/*:: this._next && */ nextMatches) {
      this._current = this._next;
      const nextStart = TimeUtil.add(this._current.end, oneNanoSecond);
      const nextEnd = TimeUtil.add(nextStart, this._readAheadRange);
      this._next = this._makeReadResult(nextStart, nextEnd, topics);
    }
    return messages.filter((message) => topics.includes(message.topic));
  }
}
