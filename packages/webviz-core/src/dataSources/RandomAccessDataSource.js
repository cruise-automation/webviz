// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { Time } from "rosbag";

import NoopMetricsCollector from "./NoopMetricsCollector";
import { ExtensionPoint, type RandomAccessDataSourceProvider } from "./types";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type {
  AdvertisePayload,
  DataSource,
  DataSourceMessage,
  DataSourceMetricsCollectorInterface,
  Message,
  PublishPayload,
  SubscribePayload,
  Timestamp,
  TopicMsg,
} from "webviz-core/src/types/dataSources";
import { fromMillis } from "webviz-core/src/util/time";

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

// the number of seconds to seek backwards to build context during a seek operation
// larger values mean more oportunity to capture context before the seek event, but are slower operations
export const SEEK_BACK_SECONDS = 0.15;

export default class RandomAccessDataSource implements DataSource {
  _provider: RandomAccessDataSourceProvider;
  _isPlaying: boolean = false;
  _listener: (DataSourceMessage) => Promise<void>;
  _speed: number = 0.2;
  _start: Time;
  _end: Time;
  _currentTime: Time;
  _lastTickMillis: ?number;
  _lastSeekTime: number = 0;
  _subscribedTopics: Set<string> = new Set();
  _providerTopics: TopicMsg[] = [];
  _onAbortCallback: (err: ?Error) => void = (err) => console.error("Unhandled error", err);
  _metricsCollector: DataSourceMetricsCollectorInterface;
  _extensionPoint: ExtensionPoint = new ExtensionPoint();
  _autoplay: boolean;

  constructor(
    provider: RandomAccessDataSourceProvider,
    metricsCollector: DataSourceMetricsCollectorInterface = new NoopMetricsCollector(),
    autoplay: boolean = false
  ) {
    this._provider = provider;
    this._metricsCollector = metricsCollector;
    this._autoplay = autoplay && !inScreenshotTests();
  }

  async setListener(listener: (DataSourceMessage) => Promise<void>): Promise<void> {
    this._listener = listener;
    // give the provider access to the listener for custom messages and initialization
    this._metricsCollector.initialized();
    this._extensionPoint.messageCallback = listener;
    const result = await this._provider.initialize(this._extensionPoint);
    this._start = result.start;
    this._currentTime = this._start;
    this._end = result.end;
    const { datatypes, topics } = result;
    this._providerTopics = topics;
    this._listener({ op: "capabilities", capabilities: ["seekBackfill"] });
    this._listener({ op: "datatypes", datatypes });
    this._emitState();
    if (this._autoplay) {
      this.startPlayback();
    }
  }

  async _getMessages(start: Time, end: Time): Promise<Message[]> {
    const messages = await this._provider.getMessages(start, end, Array.from(this._subscribedTopics));
    return messages.map((message) => {
      const topic: ?TopicMsg = this._providerTopics.find((t) => t.topic === message.topic);
      if (!topic) {
        throw new Error(`Could not find topic for message ${message.topic}`);
      }

      if (!topic.datatype) {
        throw new Error(`Missing datatype for topic: ${message.topic}`);
      }

      return {
        op: "message",
        topic: message.topic,
        datatype: topic.datatype,
        receiveTime: message.receiveTime,
        message: message.message,
      };
    });
  }

  async _tick(): Promise<void> {
    if (!this._isPlaying) {
      return;
    }
    // compute how long of a time range we want to read by taking into account
    // the time since our last read and how fast we're currently playing back
    const tickTime = performance.now();
    const durationMillis = this._lastTickMillis ? tickTime - this._lastTickMillis : 20;
    this._lastTickMillis = tickTime;

    // Read at most 80 ms * speed messages. Without this,
    // if the UI lags substantially due to GC and the delay between reads is high
    // it can result in reading a very large chunk of messages which introduces
    // even _more_ delay before the next read loop triggers, causing serious cascading UI jank.
    const rangeMillis = Math.min(durationMillis, 80) * this._speed;

    // loop to the beginning if we pass the end of the playback range
    if (Time.isGreaterThan(this._currentTime, this._end)) {
      this.seekPlayback(this._start);
      return;
    }

    const seekTime = this._lastSeekTime;
    const end: Time = Time.add(this._currentTime, fromMillis(rangeMillis));
    const messages = await this._getMessages(this._currentTime, end);

    // if we seeked while reading the do not emit messages
    // just start reading again from the new seek position
    if (this._lastSeekTime !== seekTime) {
      return;
    }

    // if we paused while reading then do not emit messages
    // and exit the read loop
    if (!this._isPlaying) {
      return;
    }

    const promises = messages.map((message) => this._listener(message));
    this._currentTime = Time.add(end, new Time(0, 1));
    await Promise.all(promises);
  }

  async _read(): Promise<void> {
    while (this._isPlaying) {
      const start = Date.now();
      await this._tick();
      const time = Date.now() - start;
      // make sure we've slept at least 16 millis or so (aprox 1 frame)
      // to give the UI some time to breathe and not burn in a tight loop
      if (time < 16) {
        await delay(16 - time);
      }
    }
    return Promise.resolve();
  }

  _emitState() {
    const msg = {
      op: "player_state",
      playing: this._isPlaying,
      speed: this._speed,
      start_time: this._start,
      end_time: this._end,
    };
    this._listener(msg);
  }

  startPlayback(): void {
    if (this._isPlaying) {
      return;
    }
    this._metricsCollector.play();
    this._isPlaying = true;
    this._emitState();
    this._read().catch((e: Error) => {
      this._isPlaying = false;
      this._onAbortCallback(e);
    });
  }

  pausePlayback(): void {
    if (!this._isPlaying) {
      return;
    }
    this._metricsCollector.pause();
    // clear out last tick millis so we don't read a huge chunk when we unpause
    this._lastTickMillis = undefined;
    this._isPlaying = false;
    this._emitState();
  }

  setPlaybackSpeed(speed: number): void {
    this._speed = speed;
    this._metricsCollector.setSpeed(speed);
    this._emitState();
  }

  seekPlayback(time: Timestamp): void {
    this._currentTime = time;
    this._metricsCollector.seek();
    const seekTime = Date.now();
    this._lastSeekTime = seekTime;
    this._listener({ op: "seek" });
    this._listener({ op: "update_time", time });
    if (!this._isPlaying) {
      this._getMessages(Time.add(time, new Time(-SEEK_BACK_SECONDS, 0)), Time.add(time, new Time(0, -1))).then(
        (messages) => {
          if (seekTime === this._lastSeekTime) {
            messages.forEach((message) => this._listener(message));
          }
        }
      );
    }
  }

  requestTopics(): void {
    this._listener({
      op: "topics",
      topics: this._providerTopics,
    });
  }

  // not implemented in random access datasource
  requestMessages(): void {}

  subscribe(request: SubscribePayload): void {
    const size = this._subscribedTopics.size;
    this._subscribedTopics.add(request.topic);
    if (this._subscribedTopics.size !== size) {
      this._extensionPoint.emit("topics", Array.from(this._subscribedTopics));
    }
  }

  unsubscribe(request: SubscribePayload): void {
    if (this._subscribedTopics.delete(request.topic)) {
      this._extensionPoint.emit("topics", Array.from(this._subscribedTopics));
    }
  }

  advertise(request: AdvertisePayload) {
    console.warn("Publishing is not supported in RandomAccessDataSource");
  }

  unadvertise(request: AdvertisePayload) {
    console.warn("Publishing is not supported in RandomAccessDataSource");
  }

  publish(payload: PublishPayload) {
    console.warn("Publishing is not supported in RandomAccessDataSource");
  }

  async close(): Promise<void> {
    this.pausePlayback();
    return this._provider.close();
  }

  onAbort = (callback: (?Error) => void): void => {
    this._onAbortCallback = callback;
  };
}
