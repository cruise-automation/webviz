// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { partition } from "lodash";
import Queue from "promise-queue";
import { type Time, TimeUtil } from "rosbag";
import uuid from "uuid";

import type { DataProvider, DataProviderMetadata, InitializationResult } from "webviz-core/src/dataProviders/types";
import { BUFFER_DURATION_SECS } from "webviz-core/src/players/OrderedStampPlayer";
import { SEEK_BACK_NANOSECONDS } from "webviz-core/src/players/RandomAccessPlayer";
import type {
  AdvertisePayload,
  BobjectMessage,
  Message,
  Player,
  PlayerState,
  Progress,
  PublishPayload,
  SubscribePayload,
  Topic,
} from "webviz-core/src/players/types";
import { getSanitizedTopics } from "webviz-core/src/util/selectors";
import sendNotification from "webviz-core/src/util/sendNotification";
import {
  fromSec,
  clampTime,
  subtractTimes,
  toMillis,
  fromMillis,
  formatSeconds,
  type TimestampMethod,
} from "webviz-core/src/util/time";

export type VideoMetadata = {|
  startTimeMs: number, // time of first message in millis (inclusive)
  endTimeMs: number, // time of last message in millis (inclusive)
  msPerFrame: number, // millis per frame
|};

export type RecordingProgressEvent = {| percentComplete: number, etaEpochMs?: number, frameRenderDurationMs?: number |};

export interface AutomatedRunClient {
  speed: number;
  msPerFrame: number;
  durationMs?: number | typeof undefined;
  workerIndex?: number;
  workerTotal?: number;
  rangeStartTime: any;
  rangeEndTime: any;
  shouldLoadDataBeforePlaying: boolean;
  onError(any): Promise<void>;
  start({ bagLengthMs: number }): void;
  markTotalFrameStart(): void;
  markTotalFrameEnd(): void;
  markFrameRenderStart(): void;
  markFrameRenderEnd(): number;
  markPreloadStart(): void;
  markPreloadEnd(): number;
  onFrameFinished(progressEvent: RecordingProgressEvent): Promise<void>;
  finish(VideoMetadata): any;
}

export const AUTOMATED_RUN_START_DELAY = process.env.NODE_ENV === "test" ? 10 : 10000;
const NO_WARNINGS = Object.freeze({});

export default class AutomatedRunPlayer implements Player {
  static className = "AutomatedRunPlayer";
  _isPlaying: boolean = false;
  _provider: DataProvider;
  _startTime: Time;
  _endTime: Time;
  _providerResult: InitializationResult;
  _providerTopics: Topic[] = [];
  _progress: Progress;
  _bobjectTopics: Set<string> = new Set();
  _parsedTopics: Set<string> = new Set();
  _listener: (PlayerState) => Promise<void>;
  _initializeTimeout: TimeoutID;
  _initialized: boolean = false;
  _id: string = uuid.v4();
  _speed: number;
  _msPerFrame: number;
  _client: AutomatedRunClient;
  _startCalled: boolean = false;
  _receivedBytes: number = 0;
  _globalMessageOrder: TimestampMethod = "receiveTime";
  // Calls to this._listener must not happen concurrently, and we want them to happen
  // deterministically so we put them in a FIFO queue.
  _emitStateQueue: Queue = new Queue(1);

  constructor(provider: DataProvider, client: AutomatedRunClient) {
    this._provider = provider;
    this._speed = client.speed;
    this._msPerFrame = client.msPerFrame;
    this._client = client;
  }

  async _getMessages(
    start: Time,
    end: Time
  ): Promise<{ parsedMessages: $ReadOnlyArray<Message>, bobjects: $ReadOnlyArray<BobjectMessage> }> {
    const parsedTopics = getSanitizedTopics(this._parsedTopics, this._providerTopics);
    const bobjectTopics = getSanitizedTopics(this._bobjectTopics, this._providerTopics);
    if (parsedTopics.length === 0 && bobjectTopics.length === 0) {
      return { parsedMessages: [], bobjects: [] };
    }
    // Make sure to clamp the start/end times to the _providerResult or getMessages will throw errors
    // TODO: Find a better way to share this logic with RandomAccessPlayer.js
    start = clampTime(start, this._providerResult.start, this._providerResult.end);
    end = clampTime(end, this._providerResult.start, this._providerResult.end);
    const messages = await this._provider.getMessages(start, end, {
      parsedMessages: parsedTopics,
      bobjects: bobjectTopics,
    });
    const { parsedMessages, rosBinaryMessages, bobjects } = messages;
    if (rosBinaryMessages?.length || bobjects == null || parsedMessages == null) {
      const messageTypes = Object.keys(messages)
        .filter((kind) => messages[kind]?.length)
        .join(",");
      throw new Error(`Invalid message types: ${messageTypes}`);
    }

    const filterMessages = (msgs) =>
      msgs.map((message) => {
        const topic: ?Topic = this._providerTopics.find((t) => t.name === message.topic);
        if (!topic) {
          throw new Error(`Could not find topic for message ${message.topic}`);
        }

        if (!topic.datatype) {
          throw new Error(`Missing datatype for topic: ${message.topic}`);
        }
        return {
          topic: message.topic,
          receiveTime: message.receiveTime,
          message: message.message,
        };
      });
    return { parsedMessages: filterMessages(parsedMessages), bobjects: filterMessages(bobjects) };
  }

  _emitState(
    messages: $ReadOnlyArray<Message>,
    bobjects: $ReadOnlyArray<BobjectMessage>,
    currentTime: Time
  ): Promise<void> {
    return this._emitStateQueue.add(async () => {
      if (!this._listener) {
        return;
      }
      const initializationResult = this._providerResult;
      if (!initializationResult.messageDefinitions || initializationResult.messageDefinitions.type === "raw") {
        throw new Error("AutomatedRunPlayer requires parsed message definitions");
      }
      return this._listener({
        isPresent: true,
        showSpinner: false,
        showInitializing: false,
        progress: this._progress,
        capabilities: [],
        playerId: this._id,
        activeData: {
          messages,
          bobjects,
          totalBytesReceived: this._receivedBytes,
          currentTime,
          startTime: this._providerResult.start,
          endTime: this._endTime,
          isPlaying: this._isPlaying,
          speed: this._speed,
          messageOrder: "receiveTime",
          lastSeekTime: 0,
          topics: this._providerTopics,
          datatypes: initializationResult.messageDefinitions.datatypes,
          parsedMessageDefinitionsByTopic: initializationResult.messageDefinitions.parsedMessageDefinitionsByTopic,
          playerWarnings: NO_WARNINGS,
        },
      });
    });
  }

  setListener(callback: (PlayerState) => Promise<void>): void {
    this._listener = callback;
  }

  setSubscriptions(subscriptions: SubscribePayload[]): void {
    const [bobjectSubscriptions, parsedSubscriptions] = partition(subscriptions, ({ format }) => format === "bobjects");
    this._bobjectTopics = new Set(bobjectSubscriptions.map(({ topic }) => topic));
    this._parsedTopics = new Set(parsedSubscriptions.map(({ topic }) => topic));

    // Wait with running until we've subscribed to a bunch of topics.
    clearTimeout(this._initializeTimeout);
    this._initializeTimeout = setTimeout(() => this._initialize(), AUTOMATED_RUN_START_DELAY);
  }

  async _initialize() {
    if (this._initialized) {
      return; // Prevent double loads.
    }
    this._initialized = true;

    this._providerResult = await this._provider.initialize({
      progressCallback: (progress: Progress) => {
        this._progress = progress;
        this._onUpdateProgress();
      },
      reportMetadataCallback: (metadata: DataProviderMetadata) => {
        switch (metadata.type) {
          case "updateReconnecting":
            sendNotification(
              "updateReconnecting should never be called here",
              `AutomatedRunPlayer only supports local playback`,
              "app",
              "error"
            );
            break;
          case "average_throughput":
            // Don't need analytics for data provider callbacks in video generation.
            break;
          case "initializationPerformance":
            break;
          case "received_bytes":
            this._receivedBytes += metadata.bytes;
            break;
          case "data_provider_stall":
            break;
          default:
            (metadata.type: empty);
        }
      },
      notifyPlayerManager: async () => {},
    });
    this._providerTopics = this._providerResult.topics.map((t) => ({ ...t, preloadable: true }));

    this._startTime = clampTime(
      subtractTimes(this._client.rangeStartTime || this._providerResult.start, fromMillis(BUFFER_DURATION_SECS * 1000)),
      this._providerResult.start,
      this._providerResult.end
    );
    this._endTime = this._getEnd();

    await this._start();
  }

  async _start() {
    // Call _getMessages to start data loading and rendering for the first frame.
    const backfillStart = subtractTimes(this._startTime, { sec: 0, nsec: SEEK_BACK_NANOSECONDS });
    const { parsedMessages, bobjects } = await this._getMessages(backfillStart, this._startTime);
    await this._emitState(parsedMessages, bobjects, backfillStart);
    if (!this._startCalled) {
      this._client.markPreloadStart();
    }

    this._startCalled = true;
    this._maybeStartPlayback();
  }

  _getMessageOrderOffsetTime() {
    // Play "past the end" when in header-stamp mode so the OrderedStampPlayer goes up to the end.
    return this._globalMessageOrder === "receiveTime" ? fromSec(0) : fromSec(BUFFER_DURATION_SECS);
  }

  _getEnd(): Time {
    const requestedDurationAsTime = this._client.durationMs
      ? fromMillis(this._client.durationMs)
      : { sec: Infinity, nsec: 0 };
    const endTimeFromDuration = TimeUtil.add(this._startTime, requestedDurationAsTime);

    const endTime = clampTime(
      endTimeFromDuration,
      this._providerResult.start,
      this._client.rangeEndTime || this._providerResult.end
    );

    return TimeUtil.add(endTime, this._getMessageOrderOffsetTime());
  }

  async _onUpdateProgress() {
    if (this._client.shouldLoadDataBeforePlaying && this._providerResult != null) {
      // Update the view and do preloading calculations. Not necessary if we're already playing.
      this._emitState([], [], this._startTime);
    }
    this._maybeStartPlayback();
  }

  async _maybeStartPlayback() {
    if (this._readyToPlay()) {
      this._run();
    }
  }

  _readyToPlay() {
    if (!this._startCalled || this._providerResult == null) {
      return false;
    }
    if (!this._client.shouldLoadDataBeforePlaying) {
      return true;
    }
    // If the client has shouldLoadDataBeforePlaying set to true, only start playback once all data has loaded.
    return (
      this._progress &&
      this._progress.fullyLoadedFractionRanges &&
      this._progress.fullyLoadedFractionRanges.length &&
      this._progress.fullyLoadedFractionRanges.every(({ start, end }) => start === 0 && end === 1)
    );
  }

  async _run() {
    if (this._isPlaying) {
      return; // Only run once
    }
    this._isPlaying = true;
    this._client.markPreloadEnd();
    console.log("AutomatedRunPlayer._run()");
    await this._emitState([], [], this._startTime);

    const videoDurationMs = toMillis(subtractTimes(this._endTime, this._startTime));
    this._client.start({ bagLengthMs: videoDurationMs });

    const startEpoch = Date.now();
    const nsBagTimePerFrame = Math.round(this._msPerFrame * this._speed * 1000000);

    // We split up the frames between the workers,
    // so we need to advance time based on the number of workers
    const workerIndex = this._client.workerIndex ?? 0;
    const workerCount = this._client.workerTotal ?? 1;
    const nsFrameTimePerWorker = nsBagTimePerFrame * workerCount;
    let currentTime = TimeUtil.add(this._startTime, {
      sec: 0,
      nsec: nsBagTimePerFrame * workerIndex,
    });
    const startBufferTime = TimeUtil.add(
      this._client.rangeStartTime || this._startTime,
      this._getMessageOrderOffsetTime()
    );

    // Main video recording loop
    while (TimeUtil.isLessThan(currentTime, this._endTime)) {
      this._client.markTotalFrameStart();

      const internalBackfillDuration = { sec: 0, nsec: SEEK_BACK_NANOSECONDS };
      const backfillStart = clampTime(
        subtractTimes(currentTime, internalBackfillDuration),
        this._startTime,
        this._endTime
      );
      const { parsedMessages, bobjects } = await this._getMessages(backfillStart, currentTime);
      this._client.markFrameRenderStart();

      // Wait for the frame render to finish.
      await this._emitState(parsedMessages, bobjects, currentTime);

      this._client.markTotalFrameEnd();
      const frameRenderDurationMs = this._client.markFrameRenderEnd();

      const bagTimeSinceStartMs = toMillis(subtractTimes(currentTime, this._startTime));

      // Capture the frame once we are passed the preload time
      if (!TimeUtil.isLessThan(currentTime, startBufferTime)) {
        const percentComplete = bagTimeSinceStartMs / videoDurationMs;
        await this._client.onFrameFinished({ percentComplete, frameRenderDurationMs });
      }
      // Advance time and loop
      currentTime = clampTime(
        TimeUtil.add(currentTime, { sec: 0, nsec: nsFrameTimePerWorker }),
        this._providerResult.start,
        this._endTime
      );
    }

    await this._client.finish({
      startTimeMs: toMillis(this._startTime),
      endTimeMs: toMillis(this._endTime),
      msPerFrame: this._msPerFrame,
    });
    const totalDuration = (Date.now() - startEpoch) / 1000;
    console.log(`AutomatedRunPlayer finished in ${formatSeconds(totalDuration)}`);
  }

  /* Public API shared functions */

  requestMessages() {}

  setPublishers(_publishers: AdvertisePayload[]) {}

  publish(_payload: PublishPayload) {
    throw new Error(`Unsupported in AutomatedRunPlayer`);
  }

  close() {
    console.warn(`close: Unsupported in AutomatedRunPlayer`);
  }

  startPlayback() {
    console.warn(`startPlayback: Unsupported in AutomatedRunPlayer`);
  }

  pausePlayback() {
    console.warn(`pausePlayback: Unsupported in AutomatedRunPlayer`);
  }

  setPlaybackSpeed(_speed: number, _backfillDuration: ?Time) {
    // This should be passed into the constructor and should not be changed.
  }

  seekPlayback(_time: Time) {
    console.warn(`seekPlayback: Unsupported in AutomatedRunPlayer`);
  }

  requestBackfill() {}
  setGlobalVariables() {
    console.warn(`setGlobalVariables: Unsupported in AutomatedRunPlayer`);
  }
  setMessageOrder(messageOrder: TimestampMethod) {
    this._globalMessageOrder = messageOrder;
  }
}
