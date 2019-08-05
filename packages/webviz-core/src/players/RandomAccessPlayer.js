// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { intersection, isEqual } from "lodash";
import microMemoize from "micro-memoize";
import { TimeUtil, type Time } from "rosbag";
import uuid from "uuid";

import NoopMetricsCollector from "./NoopMetricsCollector";
import { type RandomAccessDataProvider } from "./types";
import { rootGetDataProvider } from "webviz-core/src/players/rootGetDataProvider";
import type { DataProviderDescriptor, DataProviderMetadata } from "webviz-core/src/players/types";
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
import debouncePromise from "webviz-core/src/util/debouncePromise";
import reportError, { type ErrorType } from "webviz-core/src/util/reportError";
import { clampTime, fromMillis, subtractTimes, toSec } from "webviz-core/src/util/time";

const LOOP_MIN_BAG_TIME_IN_SEC = 1;

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

// The number of nanoseconds to seek backwards to build context during a seek
// operation larger values mean more oportunity to capture context before the
// seek event, but are slower operations. We've chosen 99ms since our internal tool (Tableflow)
// publishes at 10hz, and we do NOT want to pull in a range of messages that
// exceeds that frequency.
export const SEEK_BACK_NANOSECONDS = 99 /* ms */ * 1000 * 1000;

const capabilities = [PlayerCapabilities.setSpeed];

const getTopics = microMemoize(
  (subscribedTopics: Set<string>, providerTopics: Topic[]): string[] => {
    return intersection(Array.from(subscribedTopics), providerTopics.map(({ name }) => name));
  }
);

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
  _cancelSeekBackfill: boolean = false;
  _subscribedTopics: Set<string> = new Set();
  _providerTopics: Topic[] = [];
  _providerDatatypes: RosDatatypes = {};
  _metricsCollector: PlayerMetricsCollectorInterface;
  _autoplay: boolean;
  _initializing: boolean = true;
  _initialized: boolean = false;
  _reconnecting: boolean = false;
  _progress: Progress = {};
  _id: string = uuid.v4();
  _messages: Message[] = [];
  _hasError = false;

  constructor(
    providerDescriptor: DataProviderDescriptor,
    metricsCollector: PlayerMetricsCollectorInterface = new NoopMetricsCollector(),
    autoplay: boolean = false
  ) {
    if (process.env.NODE_ENV === "test" && providerDescriptor.name === "TestProvider") {
      this._provider = providerDescriptor.args.provider;
    } else {
      this._provider = rootGetDataProvider(providerDescriptor);
    }
    this._metricsCollector = metricsCollector;
    this._autoplay = autoplay;
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
        this._currentTime = start;
        this._end = end;
        this._providerTopics = topics;
        this._providerDatatypes = datatypes;
        this._initializing = false;

        // If subscriptions came in while we were initializing, trigger an initial getMessages() call to kick off loading data.
        if (this._subscribedTopics.size !== 0) {
          this.seekPlayback(this._start);
        } else {
          this._emitState();
        }

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

  _emitState() {
    // reportInitialized needs to be outside of the debounced function, because we don't want
    // the listener's callback (which may be waiting on a requestAnimationFrame) to block us from
    // measuring when initialization finished.
    this._reportInitialized();
    return this._emitStateDebounced();
  }

  _emitStateDebounced = debouncePromise(() => {
    if (!this._listener) {
      return Promise.resolve();
    }

    if (this._hasError) {
      return this._listener({
        isPresent: false,
        showSpinner: false,
        showInitializing: false,
        progress: {},
        capabilities: [],
        playerId: this._id,
        activeData: undefined,
      });
    }

    const messages = this._messages;
    this._messages = [];
    if (messages.length > 0) {
      // If we're outputting any messages, we need to cancel any in-progress backfills. Otherwise
      // we'd be "traveling back in time".
      this._cancelSeekBackfill = true;
    }
    return this._listener({
      isPresent: true,
      showSpinner: this._initializing || this._reconnecting,
      showInitializing: this._initializing,
      progress: this._progress,
      capabilities,
      playerId: this._id,
      activeData: this._initializing
        ? undefined
        : {
            messages,
            currentTime: clampTime(this._currentTime, this._start, this._end),
            startTime: this._start,
            endTime: this._end,
            isPlaying: this._isPlaying,
            speed: this._speed,
            lastSeekTime: this._lastSeekTime,
            topics: this._providerTopics,
            datatypes: this._providerDatatypes,
          },
    });
  });

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
        // Just don't loop at all in screenshot / integration tests.
        this.pausePlayback();
        return;
      }
      if (toSec(subtractTimes(this._end, this._start)) < LOOP_MIN_BAG_TIME_IN_SEC) {
        // Don't loop for short bags.
        this.pausePlayback();
        return;
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
    await this._emitStateDebounced.currentPromise;

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
    const topics = getTopics(this._subscribedTopics, this._providerTopics);
    const messages = await this._provider.getMessages(start, end, topics);
    return messages
      .map((message) => {
        if (!topics.includes(message.topic)) {
          reportError(
            `Unexpected topic encountered: ${message.topic}; skipped message`,
            `Full message details: ${JSON.stringify(message)}`,
            "app"
          );
          return undefined;
        }
        const topic: ?Topic = this._providerTopics.find((t) => t.name === message.topic);
        if (!topic) {
          reportError(
            `Could not find topic for message ${message.topic}; skipped message`,
            `Full message details: ${JSON.stringify(message)}`,
            "app"
          );
          return undefined;
        }
        if (!topic.datatype) {
          reportError(
            `Missing datatype for topic: ${message.topic}; skipped message`,
            `Full message details: ${JSON.stringify(message)}`,
            "app"
          );
          return undefined;
        }

        return {
          op: "message",
          topic: message.topic,
          datatype: topic.datatype,
          receiveTime: message.receiveTime,
          message: message.message,
        };
      })
      .filter(Boolean);
  }

  startPlayback(): void {
    if (this._isPlaying) {
      return;
    }
    this._metricsCollector.play(this._speed);
    this._isPlaying = true;

    // If we had paused at the end, pressing play should loop back to the beginning.
    if (isEqual(this._currentTime, this._end)) {
      this.seekPlayback(this._start);
    } else {
      this._emitState();
    }

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
    if (this._initializing || this._initialized) {
      return;
    }

    if (
      !this._progress.percentageByTopic ||
      Object.values(this._progress.percentageByTopic).every((percentage) => Number(percentage) >= 100)
    ) {
      this._metricsCollector.initialized();
      this._initialized = true;
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
    this._cancelSeekBackfill = false;
    this._emitState();

    if (!this._isPlaying) {
      this._getMessages(
        TimeUtil.add(clampTime(time, TimeUtil.add(this._start, { sec: 0, nsec: SEEK_BACK_NANOSECONDS }), this._end), {
          sec: 0,
          nsec: -SEEK_BACK_NANOSECONDS,
        }),
        time
      ).then((messages) => {
        // Only emit the messages if we haven't seeked again / emitted messages since we
        // started loading them. Note that for the latter part just checking for `isPlaying`
        // is not enough because the user might have started playback and then paused again!
        // Therefore we really need something like `this._cancelSeekBackfill`.
        if (this._lastSeekTime === seekTime && !this._cancelSeekBackfill) {
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
    if (!isEqual(oldSubscribedTopics, subscribedTopics) && !this._isPlaying && !this._initializing) {
      // Trigger a seek so that we backfill recent messages on the newly subscribed topics.
      this.seekPlayback(this._currentTime);
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
