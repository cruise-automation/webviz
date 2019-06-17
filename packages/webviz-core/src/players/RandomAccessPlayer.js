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
import type { DataProviderMetadata } from "webviz-core/src/players/types";
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
import reportError, { type ErrorType } from "webviz-core/src/util/reportError";
import { clampTime, fromMillis, subtractTimes, toSec } from "webviz-core/src/util/time";

const LOOP_MIN_BAG_TIME_IN_SEC = 1;

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

// the number of nanoseconds to seek backwards to build context during a seek operation
// larger values mean more oportunity to capture context before the seek event, but are slower operations
export const SEEK_BACK_NANOSECONDS = 150 /* ms */ * 1000 * 1000;

const capabilities = [PlayerCapabilities.initialization];

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
  _reconnecting: boolean = false;
  _progress: Progress = {};
  _id: string = uuid.v4();
  _messages: Message[] = [];
  _lastEmitPromise: Promise<void> = Promise.resolve();
  _hasSetEmitStateCallback: boolean = false;
  _hasError = false;

  constructor(
    provider: RandomAccessDataProvider,
    metricsCollector: PlayerMetricsCollectorInterface = new NoopMetricsCollector(),
    autoplay: boolean = false
  ) {
    this._provider = provider;
    this._metricsCollector = metricsCollector;
    this._autoplay = autoplay && !inScreenshotTests();
  }

  _setError(message: string, details: string | Error, errorType: ErrorType) {
    reportError(message, details, errorType);
    this._hasError = true;
    this._isPlaying = false;
    this._provider.close();
    this._emitState();
  }

  setListener(listener: (PlayerState) => Promise<void>) {
    this._listener = listener;
    this._emitState();

    this._provider
      .initialize({
        progressCallback: (progress: Progress) => {
          this._progress = progress;
          this._emitState();
        },
        addTopicsCallback: (topicsCallback: (string[]) => void) => {
          // Register any currently set subscriptions; otherwise, we wont
          // alert the provider of new topics until the next time our subscriptions change.
          topicsCallback(Array.from(this._subscribedTopics));
          this._topicsCallbacks.push(topicsCallback);
        },
        reportMetadataCallback: (metadata: DataProviderMetadata) => {
          switch (metadata.type) {
            case "error":
              this._setError(metadata.message, `Thrown in ${metadata.source}`, metadata.errorType);
              break;
            case "updateReconnecting":
              this._reconnecting = metadata.reconnecting;
              this._emitState();
              break;
            default:
              (metadata.type: empty);
          }
        },
      })
      .then(({ start, end, topics, datatypes, connectionsByTopic }) => {
        if (connectionsByTopic) {
          throw new Error("Use ParseMessagesDataProvider to parse raw messages");
        }

        this._start = start;
        // Since _currentTime is defined as the end of the last range that we emitted messages for
        // (inclusive), we have to subtract 1 nanosecond at the start, otherwise we might
        // double-emit messages with a receiveTime that is exactly equal to _currentTime.
        this._setCurrentTime(TimeUtil.add(start, { sec: 0, nsec: -1 }));
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
        this._setError("Error initializing player", error, "app");
      });
  }

  _emitState(): void {
    if (!this._listener) {
      return;
    }
    if (this._hasSetEmitStateCallback) {
      return;
    }
    this._reportInitialized();

    this._hasSetEmitStateCallback = true;
    this._lastEmitPromise.then(() => {
      this._hasSetEmitStateCallback = false;
      if (this._hasError) {
        this._lastEmitPromise = this._listener({
          isPresent: false,
          showSpinner: false,
          showInitializing: false,
          progress: {},
          capabilities: [],
          playerId: this._id,
          activeData: undefined,
        });
        return;
      }

      this._lastEmitPromise = this._listener({
        isPresent: true,
        showSpinner: this._initializing || this._reconnecting,
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
    if (this._initializing || !this._isPlaying || this._hasError) {
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
    if (isEqual(this._currentTime, this._end)) {
      if (inScreenshotTests()) {
        return; // Just don't loop at all in screenshot / integration tests.
      }
      if (toSec(subtractTimes(this._end, this._start)) < LOOP_MIN_BAG_TIME_IN_SEC) {
        return; // Don't loop for short bags.
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
    const start: Time = clampTime(TimeUtil.add(this._currentTime, { sec: 0, nsec: 1 }), this._start, this._end);
    const end: Time = clampTime(TimeUtil.add(this._currentTime, fromMillis(rangeMillis)), this._start, this._end);
    const messages = await this._getMessages(start, end);
    await this._lastEmitPromise;

    // if we seeked while reading the do not emit messages
    // just start reading again from the new seek position
    if (this._lastSeekTime !== seekTime) {
      return;
    }

    // Update the currentTime when we know a seek didn't happen.
    this._setCurrentTime(end);

    // if we paused while reading then do not emit messages
    // and exit the read loop
    if (!this._isPlaying) {
      return;
    }

    this._messages = this._messages.concat(messages);
    this._emitState();
  }

  async _read(): Promise<void> {
    while (this._isPlaying && !this._hasError) {
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
    this._metricsCollector.play(this._speed);
    this._isPlaying = true;
    this._emitState();
    this._read().catch((e: Error) => {
      this._setError(e.message, e, "app");
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

  _reportInitialized() {
    if (this._initializing) {
      return;
    }

    if (
      !this._progress.percentageByTopic ||
      Object.values(this._progress.percentageByTopic).every((percentage) => Number(percentage) >= 100)
    ) {
      this._metricsCollector.initialized();
    }
  }

  _setCurrentTime(time: Time): void {
    this._metricsCollector.recordPlaybackTime(time);
    this._currentTime = time;
  }

  seekPlayback(time: Time): void {
    this._metricsCollector.seek(time);
    this._setCurrentTime(time);

    const seekTime = Date.now();
    this._lastSeekTime = seekTime;
    this._emitState();

    if (!this._isPlaying) {
      this._getMessages(
        TimeUtil.add(clampTime(time, TimeUtil.add(this._start, { sec: 0, nsec: SEEK_BACK_NANOSECONDS }), this._end), {
          sec: 0,
          nsec: -SEEK_BACK_NANOSECONDS,
        }),
        time
      ).then((messages) => {
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
    this._metricsCollector.close();
  }
}
