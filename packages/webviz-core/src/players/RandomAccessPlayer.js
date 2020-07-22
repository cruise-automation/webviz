// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { isEqual } from "lodash";
import { TimeUtil, type Time } from "rosbag";
import uuid from "uuid";

import delay from "webviz-core/shared/delay";
import { MEM_CACHE_BLOCK_SIZE_NS } from "webviz-core/src/dataProviders/MemoryCacheDataProvider";
import { rootGetDataProvider } from "webviz-core/src/dataProviders/rootGetDataProvider";
import type { DataProvider, DataProviderDescriptor, DataProviderMetadata } from "webviz-core/src/dataProviders/types";
import filterMap from "webviz-core/src/filterMap";
import NoopMetricsCollector from "webviz-core/src/players/NoopMetricsCollector";
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
  type MessageDefinitionsByTopic,
} from "webviz-core/src/players/types";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import debouncePromise from "webviz-core/src/util/debouncePromise";
import { SEEK_TO_QUERY_KEY } from "webviz-core/src/util/globalConstants";
import { getSanitizedTopics } from "webviz-core/src/util/selectors";
import sendNotification, { type NotificationType } from "webviz-core/src/util/sendNotification";
import {
  toMillis,
  clampTime,
  fromMillis,
  fromNanoSec,
  subtractTimes,
  toSec,
  type TimestampMethod,
} from "webviz-core/src/util/time";

export const MISSING_CORS_ERROR_TITLE = "Often this is due to missing CORS headers on the requested URL";

const LOOP_MIN_BAG_TIME_IN_SEC = 1;
const NO_WARNINGS = Object.freeze({});

// The number of nanoseconds to seek backwards to build context during a seek
// operation larger values mean more opportunity to capture context before the
// seek event, but are slower operations. We shouldn't make this number too big,
// otherwise we pull in too many unnecessary messages, making seeking slow. But
// we also don't want it to be too low, otherwise you don't see enough data when
// seeking.
// Unfortunately right now we need a pretty high number here, especially when
// using "synchronized topics" (e.g. in the Image panel) when one of the topics
// is publishing at a fairly low rate.
// TODO(JP): Add support for subscribers to express that we're only interested
// in the last message on a topic, and then support that in `getMessages` as
// well, so we can fetch pretty old messages without incurring the cost of
// fetching too many.
export const SEEK_BACK_NANOSECONDS = 299 /* ms */ * 1e6;

// Amount to seek into the bag from the start when loading the player, to show
// something useful on the screen. Ideally this is less than BLOCK_SIZE_NS from
// MemoryCacheDataProvider so we still stay within the first block when fetching
// initial data.
export const SEEK_ON_START_NS = 99 /* ms */ * 1e6;
if (SEEK_ON_START_NS >= MEM_CACHE_BLOCK_SIZE_NS) {
  throw new Error(
    "SEEK_ON_START_NS should be less than MEM_CACHE_BLOCK_SIZE_NS (to keep initial backfill within one block)"
  );
}
if (SEEK_ON_START_NS >= SEEK_BACK_NANOSECONDS) {
  throw new Error(
    "SEEK_ON_START_NS should be less than SEEK_BACK_NANOSECONDS (otherwise we skip over messages at the start)"
  );
}

export const SEEK_START_DELAY_MS = 100;

const capabilities = [PlayerCapabilities.setSpeed];

// A `Player` that wraps around a tree of `DataProviders`.
export default class RandomAccessPlayer implements Player {
  _provider: DataProvider;
  _isPlaying: boolean = false;
  _wasPlayingBeforeTabSwitch = false;
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
  _topicsToOnlyLoadInBlocks: Set<string> = new Set();
  _providerTopics: Topic[] = [];
  _providerDatatypes: RosDatatypes = {};
  _metricsCollector: PlayerMetricsCollectorInterface;
  _initializing: boolean = true;
  _initialized: boolean = false;
  _reconnecting: boolean = false;
  _progress: Progress = Object.freeze({});
  _id: string = uuid.v4();
  _messages: Message[] = [];
  _messageOrder: TimestampMethod = "receiveTime";
  _hasError = false;
  _closed = false;
  _seekToTime: ?Time;
  _lastRangeMillis: ?number;
  _messageDefinitionsByTopic: MessageDefinitionsByTopic;

  constructor(
    providerDescriptor: DataProviderDescriptor,
    { metricsCollector, seekToTime }: { metricsCollector: ?PlayerMetricsCollectorInterface, seekToTime: ?Time }
  ) {
    if (process.env.NODE_ENV === "test" && providerDescriptor.name === "TestProvider") {
      this._provider = providerDescriptor.args.provider;
    } else {
      this._provider = rootGetDataProvider(providerDescriptor);
    }
    this._metricsCollector = metricsCollector || new NoopMetricsCollector();
    this._seekToTime = seekToTime;

    document.addEventListener("visibilitychange", this._handleDocumentVisibilityChange, false);
  }

  // If the user switches tabs, we won't actually play because no requestAnimationFrames will be called.
  // Make sure this is reflected in application state and in metrics as a pause and resume.
  _handleDocumentVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      if (this._isPlaying) {
        this.pausePlayback();
        this._wasPlayingBeforeTabSwitch = true;
      }
    } else if (document.visibilityState === "visible" && this._wasPlayingBeforeTabSwitch) {
      this._wasPlayingBeforeTabSwitch = false;
      this.startPlayback();
    }
  };

  _setError(message: string, details: string | Error, errorType: NotificationType) {
    sendNotification(message, details, errorType, "error");
    this._hasError = true;
    this._isPlaying = false;
    if (!this._initializing) {
      this._provider.close();
    }
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
            case "updateReconnecting":
              this._reconnecting = metadata.reconnecting;
              this._emitState();
              break;
            case "performance":
              this._metricsCollector.recordDataProviderPerformance(metadata);
              break;
            default:
              (metadata.type: empty);
          }
        },
      })
      .then(({ start, end, topics, datatypes, messageDefinitionsByTopic, providesParsedMessages }) => {
        if (!providesParsedMessages) {
          throw new Error("Use ParseMessagesDataProvider to parse raw messages");
        }

        const initialTime = clampTime(
          this._seekToTime || TimeUtil.add(start, fromNanoSec(SEEK_ON_START_NS)),
          start,
          end
        );

        this._start = start;
        this._currentTime = initialTime;
        this._end = end;
        this._providerTopics = topics;
        this._providerDatatypes = datatypes;
        this._messageDefinitionsByTopic = messageDefinitionsByTopic;
        this._initializing = false;
        this._reportInitialized();

        // Wait a bit until panels have had the chance to subscribe to topics before we start
        // playback.
        setTimeout(() => {
          if (this._closed) {
            return;
          }
          // Only do the initial seek if we haven't started playing already.
          if (!this._isPlaying && TimeUtil.areSame(this._currentTime, initialTime)) {
            this.seekPlayback(initialTime);
          }
        }, SEEK_START_DELAY_MS);
      })
      .catch((error: Error) => {
        // When CORS is misconfigured then that is really a user error, so we shouldn't be logging it.
        const errorType = error.message.includes(MISSING_CORS_ERROR_TITLE) ? "user" : "app";
        this._setError("Error initializing player", error, errorType);
      });
  }

  _emitState = debouncePromise(() => {
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

    // If we are paused at a certain time, update seek-to query param
    if (this._currentTime && !this._isPlaying) {
      const dataStart = clampTime(TimeUtil.add(this._start, fromNanoSec(SEEK_ON_START_NS)), this._start, this._end);
      const atDataStart = TimeUtil.areSame(this._currentTime, dataStart);
      const params = new URLSearchParams(location.search);

      // If paused at the start of a datasource, remove seek-to param
      if (atDataStart) {
        params.delete(SEEK_TO_QUERY_KEY);
      } else {
        // Otherwise, update the seek-to param
        params.set(SEEK_TO_QUERY_KEY, `${toMillis(this._currentTime)}`);
      }
      const newSearch = params.toString();
      history.replaceState({}, window.title, `${location.pathname}${newSearch ? `?${newSearch}` : newSearch}`);
    }

    const data = {
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
            messageOrder: this._messageOrder,
            currentTime: clampTime(this._currentTime, this._start, this._end),
            startTime: this._start,
            endTime: this._end,
            isPlaying: this._isPlaying,
            speed: this._speed,
            lastSeekTime: this._lastSeekTime,
            topics: this._providerTopics,
            datatypes: this._providerDatatypes,
            messageDefinitionsByTopic: this._messageDefinitionsByTopic,
            playerWarnings: NO_WARNINGS,
          },
    };

    return this._listener(data);
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

    // Read at most 300ms worth of messages, otherwise things can get out of control if rendering
    // is very slow. Also, smooth over the range that we request, so that a single slow frame won't
    // cause the next frame to also be unnecessarily slow by increasing the frame size.
    let rangeMillis = Math.min(durationMillis * this._speed, 300);
    if (this._lastRangeMillis != null) {
      rangeMillis = this._lastRangeMillis * 0.9 + rangeMillis * 0.1;
    }
    this._lastRangeMillis = rangeMillis;

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
        this._playFromStart();
      }
      return;
    }

    const seekTime = this._lastSeekTime;
    const start: Time = clampTime(TimeUtil.add(this._currentTime, { sec: 0, nsec: 1 }), this._start, this._end);
    const end: Time = clampTime(TimeUtil.add(this._currentTime, fromMillis(rangeMillis)), this._start, this._end);
    const messages = await this._getMessages(start, end);
    await this._emitState.currentPromise;

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

  _read = debouncePromise(async () => {
    try {
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
    } catch (e) {
      this._setError(e.message, e, "app");
    }
  });

  async _getMessages(start: Time, end: Time): Promise<Message[]> {
    const topics = getSanitizedTopics(this._subscribedTopics, this._providerTopics);
    if (topics.length === 0) {
      return [];
    }
    const messages = await this._provider.getMessages(start, end, topics, {
      topicsToOnlyLoadInBlocks: this._topicsToOnlyLoadInBlocks,
    });

    // It is very important that we record first emitted messages here, since
    // `_emitState` is awaited on `requestAnimationFrame`, which will not be
    // invoked unless a user's browser is focused on the current session's tab.
    // Moreover, there is a disproportionally small amount of time between when we procure
    // messages here and when they are set to playerState.
    if (messages.length) {
      this._metricsCollector.recordTimeToFirstMsgs();
    }
    return filterMap(messages, (message) => {
      if (!topics.includes(message.topic)) {
        sendNotification(
          `Unexpected topic encountered: ${message.topic}; skipped message`,
          `Full message details: ${JSON.stringify(message)}`,
          "app",
          "warn"
        );
        return undefined;
      }
      const topic: ?Topic = this._providerTopics.find((t) => t.name === message.topic);
      if (!topic) {
        sendNotification(
          `Could not find topic for message ${message.topic}; skipped message`,
          `Full message details: ${JSON.stringify(message)}`,
          "app",
          "warn"
        );
        return undefined;
      }
      if (!topic.datatype) {
        sendNotification(
          `Missing datatype for topic: ${message.topic}; skipped message`,
          `Full message details: ${JSON.stringify(message)}`,
          "app",
          "warn"
        );
        return undefined;
      }

      return {
        topic: message.topic,
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
    this._read();
  }

  pausePlayback(): void {
    if (!this._isPlaying) {
      return;
    }
    this._metricsCollector.pause();
    // clear out last tick millis so we don't read a huge chunk when we unpause
    this._lastTickMillis = undefined;
    this._isPlaying = false;
    this._emitState(true);
  }

  setPlaybackSpeed(speed: number): void {
    delete this._lastRangeMillis;
    this._speed = speed;
    this._metricsCollector.setSpeed(speed);
    this._emitState();
  }

  _reportInitialized() {
    if (this._initializing || this._initialized) {
      return;
    }
    this._metricsCollector.initialized();
    this._initialized = true;
  }

  _setCurrentTime(time: Time): void {
    this._metricsCollector.recordPlaybackTime(time);
    this._currentTime = clampTime(time, this._start, this._end);
  }

  _seekPlaybackInternal = debouncePromise(async (backfillDuration: ?Time) => {
    const seekTime = Date.now();
    this._lastSeekTime = seekTime;
    this._cancelSeekBackfill = false;
    // cancel any queued _emitState that might later emit messages from before we seeked
    this._messages = [];

    // Backfill a few hundred milliseconds of data if we're paused so panels have something to show.
    // If we're playing, we'll give the panels some data soon anyway.
    const internalBackfillDuration = { sec: 0, nsec: this._isPlaying ? 0 : SEEK_BACK_NANOSECONDS };
    // Add on any extra time needed by the OrderedStampPlayer.
    const totalBackfillDuration = TimeUtil.add(internalBackfillDuration, backfillDuration || { sec: 0, nsec: 0 });
    const backfillStart = clampTime(subtractTimes(this._currentTime, totalBackfillDuration), this._start, this._end);
    // Only getMessages if we have some messages to get.
    if (backfillDuration || !this._isPlaying) {
      const messages = await this._getMessages(backfillStart, this._currentTime);
      // Only emit the messages if we haven't seeked again / emitted messages since we
      // started loading them. Note that for the latter part just checking for `isPlaying`
      // is not enough because the user might have started playback and then paused again!
      // Therefore we really need something like `this._cancelSeekBackfill`.
      if (this._lastSeekTime === seekTime && !this._cancelSeekBackfill) {
        this._messages = messages;
        await this._emitState();
      }
    }
  });

  seekPlayback(time: Time, backfillDuration: ?Time): void {
    this._metricsCollector.seek(time);
    this._setCurrentTime(time);
    this._seekPlaybackInternal(backfillDuration);
  }

  _playFromStart(): void {
    if (!this._isPlaying) {
      throw new Error("Can only play from the very start when we're already playing.");
    }
    // Start a nanosecond before start time to get messages exactly at start time.
    this.seekPlayback(TimeUtil.add(this._start, { sec: 0, nsec: -1 }));
  }

  setSubscriptions(newSubscriptions: SubscribePayload[]): void {
    const subscribedTopics = new Set(newSubscriptions.map(({ topic }) => topic));
    const topicsToOnlyLoadInBlocks = new Set(subscribedTopics);
    for (const subscription of newSubscriptions) {
      if (!subscription.onlyLoadInBlocks) {
        topicsToOnlyLoadInBlocks.delete(subscription.topic);
      }
    }

    this._subscribedTopics = subscribedTopics;
    this._topicsToOnlyLoadInBlocks = topicsToOnlyLoadInBlocks;
  }

  requestBackfill() {
    if (this._isPlaying || this._initializing) {
      return;
    }
    this.seekPlayback(this._currentTime);
  }

  setPublishers(_publishers: AdvertisePayload[]) {}

  publish(_payload: PublishPayload) {
    console.warn("Publishing is not supported in RandomAccessPlayer");
  }

  close() {
    this._isPlaying = false;
    this._closed = true;
    if (!this._initializing && !this._hasError) {
      this._provider.close();
    }
    this._metricsCollector.close();
    document.removeEventListener("visibilitychange", this._handleDocumentVisibilityChange);
  }
}
