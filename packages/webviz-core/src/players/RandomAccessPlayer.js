// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { isEqual } from "lodash";
import { TimeUtil, type Time } from "rosbag";
import uuid from "uuid";

import NoopMetricsCollector from "./NoopMetricsCollector";
import { type RandomAccessDataProvider } from "./types";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import {
  type AdvertisePayload,
  type Message,
  type Player,
  PlayerCapabilities,
  type PlayerMetricsCollectorInterface,
  type PlayerState,
  type Progress,
  type PublishPayload,
  type SubscribePayload,
  type Topic,
} from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import reportError from "webviz-core/src/util/reportError";
import { fromMillis } from "webviz-core/src/util/time";

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

// the number of nanoseconds to seek backwards to build context during a seek operation
// larger values mean more oportunity to capture context before the seek event, but are slower operations
export const SEEK_BACK_NANOSECONDS = 150 /* ms */ * 1000 * 1000;

const capabilities = [PlayerCapabilities.seekBackfill, PlayerCapabilities.initialization];

export default class RandomAccessPlayer implements Player {
  _provider: RandomAccessDataProvider;
  _isPlaying: boolean = false;
  _listener: (PlayerState) => Promise<void>;
  _speed: number = 0.2;
  _start: Time;
  _end: Time;
  // _currentTime is defined as the end of the last range that we emitted messages for.
  // In other words, we may emit messages that <= currentTime, but not after currentTime.
  _currentTime: Time;
  _lastTickMillis: ?number;
  _lastSeekTime: number = Date.now();
  _subscribedTopics: Set<string> = new Set();
  _providerTopics: Topic[] = [];
  _providerDatatypes: RosDatatypes = {};
  _metricsCollector: PlayerMetricsCollectorInterface;
  _autoplay: boolean;
  _topicsCallbacks: ((string[]) => void)[] = [];
  _initializing: boolean = true;
  _progress: Progress = {};
  _id: string = uuid.v4();
  _messages: Message[] = [];
  _lastEmitPromise: Promise<void> = Promise.resolve();
  _hasSetEmitStateCallback: boolean = false;

  constructor(
    provider: RandomAccessDataProvider,
    metricsCollector: PlayerMetricsCollectorInterface = new NoopMetricsCollector(),
    autoplay: boolean = false
  ) {
    this._provider = provider;
    this._metricsCollector = metricsCollector;
    this._autoplay = autoplay && !inScreenshotTests();
  }

  setListener(listener: (PlayerState) => Promise<void>) {
    this._listener = listener;
    this._metricsCollector.initialized();
    this._emitState();

    this._provider
      .initialize({
        progressCallback: (progress: Progress) => {
          this._progress = progress;
          this._emitState();
        },
        addTopicsCallback: (topicsCallback: (string[]) => void) => {
          this._topicsCallbacks.push(topicsCallback);
        },
      })
      .then(({ start, end, topics, datatypes }) => {
        this._start = start;
        // Since _currentTime is defined as the end of the last range that we emitted messages for
        // (inclusive), we have to subtract 1 nanosecond at the start, otherwise we might
        // double-emit messages with a receiveTime that is exactly equal to _currentTime.
        this._currentTime = TimeUtil.add(start, { sec: 0, nsec: -1 });
        this._end = end;
        this._providerTopics = topics;
        this._providerDatatypes = datatypes;
        this._initializing = false;
        this._emitState();

        if (this._autoplay) {
          // Wait a bit until panels have had the chance to subscribe to topics before we start
          // playback.
          // TODO(JP).
          setTimeout(() => {
            this.startPlayback();
          }, 100);
        }
      })
      .catch((error: Error) => {
        this._listener({
          isPresent: false,
          showSpinner: false,
          showInitializing: false,
          progress: {},
          capabilities: [],
          playerId: this._id,
          activeData: undefined,
        });
        reportError("Error initializing player", error, "app");
      });
  }

  _emitState(): void {
    if (!this._listener) {
      return;
    }
    if (this._hasSetEmitStateCallback) {
      return;
    }

    this._hasSetEmitStateCallback = true;
    this._lastEmitPromise.then(() => {
      this._hasSetEmitStateCallback = false;
      this._lastEmitPromise = this._listener({
        isPresent: true,
        showSpinner: this._initializing,
        showInitializing: this._initializing,
        progress: this._progress,
        capabilities,
        playerId: this._id,
        activeData: this._initializing
          ? undefined
          : {
              messages: this._messages,
              currentTime: TimeUtil.isLessThan(this._currentTime, this._start)
                ? this._start
                : TimeUtil.isLessThan(this._end, this._currentTime)
                ? this._end
                : this._currentTime,
              startTime: this._start,
              endTime: this._end,
              isPlaying: this._isPlaying,
              speed: this._speed,
              lastSeekTime: this._lastSeekTime,
              topics: this._providerTopics,
              datatypes: this._providerDatatypes,
            },
      });
      this._messages = [];
    });
  }

  async _tick(): Promise<void> {
    if (this._initializing || !this._isPlaying) {
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
    if (TimeUtil.isGreaterThan(this._currentTime, this._end)) {
      if (inScreenshotTests()) {
        return; // Just don't loop at all in screenshot / integration tests.
      }

      // Wait a little bit before we loop back. This helps with extremely small bags; otherwise
      // it looks like it's stuck at the beginning of the bag.
      await delay(500);
      if (this._isPlaying) {
        this.seekPlayback(this._start);
      }
      return;
    }

    const seekTime = this._lastSeekTime;
    const end: Time = TimeUtil.add(this._currentTime, fromMillis(rangeMillis));

    const messages = await this._getMessages(TimeUtil.add(this._currentTime, { sec: 0, nsec: 1 }), end);
    await this._lastEmitPromise;

    // if we seeked while reading the do not emit messages
    // just start reading again from the new seek position
    if (this._lastSeekTime !== seekTime) {
      return;
    }

    // Update the currentTime when we know a seek didn't happen.
    this._currentTime = end;

    // if we paused while reading then do not emit messages
    // and exit the read loop
    if (!this._isPlaying) {
      return;
    }

    this._messages = this._messages.concat(messages);
    this._emitState();
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
  }

  async _getMessages(start: Time, end: Time): Promise<Message[]> {
    const messages = await this._provider.getMessages(start, end, Array.from(this._subscribedTopics));
    return messages.map((message) => {
      const topic: ?Topic = this._providerTopics.find((t) => t.name === message.topic);
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

  startPlayback(): void {
    if (this._isPlaying) {
      return;
    }
    this._metricsCollector.play();
    this._isPlaying = true;
    this._emitState();
    this._read().catch((e: Error) => {
      this._isPlaying = false;
      throw e;
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

  seekPlayback(time: Time): void {
    this._currentTime = time;
    this._metricsCollector.seek();
    const seekTime = Date.now();
    this._lastSeekTime = seekTime;
    this._emitState();

    if (!this._isPlaying) {
      this._getMessages(TimeUtil.add(time, { sec: 0, nsec: -SEEK_BACK_NANOSECONDS }), time).then((messages) => {
        if (seekTime === this._lastSeekTime) {
          this._messages = messages;
          this._emitState();
        }
      });
    }
  }

  setSubscriptions(subscriptions: SubscribePayload[]): void {
    const oldSubscribedTopics = this._subscribedTopics;
    const subscribedTopics = new Set(subscriptions.map(({ topic }) => topic));
    this._subscribedTopics = subscribedTopics;
    if (!isEqual(oldSubscribedTopics, subscribedTopics)) {
      const topics = Array.from(this._subscribedTopics);
      this._topicsCallbacks.forEach((callback) => callback(topics));
    }
  }

  setPublishers(publishers: AdvertisePayload[]) {}

  publish(payload: PublishPayload) {
    console.warn("Publishing is not supported in RandomAccessPlayer");
  }

  close() {
    this._isPlaying = false;
    this._provider.close();
  }
}
