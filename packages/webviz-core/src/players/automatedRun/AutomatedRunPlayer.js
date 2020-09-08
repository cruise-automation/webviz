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

import { getExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import type { DataProvider, DataProviderMetadata, InitializationResult } from "webviz-core/src/dataProviders/types";
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
import { USER_ERROR_PREFIX } from "webviz-core/src/util/globalConstants";
import { getSanitizedTopics } from "webviz-core/src/util/selectors";
import sendNotification, {
  type NotificationType,
  type NotificationSeverity,
  type DetailsType,
  detailsToString,
  setNotificationHandler,
} from "webviz-core/src/util/sendNotification";
import { clampTime, subtractTimes, toMillis } from "webviz-core/src/util/time";

export interface AutomatedRunClient {
  speed: number;
  msPerFrame: number;
  shouldLoadDataBeforePlaying: boolean;
  onError(any): Promise<void>;
  start({ bagLengthMs: number }): void;
  markTotalFrameStart(): void;
  markTotalFrameEnd(): void;
  markFrameRenderStart(): void;
  markFrameRenderEnd(): number;
  markPreloadStart(): void;
  markPreloadEnd(): number;
  onFrameFinished(frameIndex: number): Promise<void>;
  finish(): any;
}

export const AUTOMATED_RUN_START_DELAY = process.env.NODE_ENV === "test" ? 10 : 2000;
const NO_WARNINGS = Object.freeze({});

function formatSeconds(sec: number): string {
  const date = new Date(0);
  date.setSeconds(sec);
  return date.toISOString().substr(11, 8);
}

export default class AutomatedRunPlayer implements Player {
  static className = "AutomatedRunPlayer";
  _isPlaying: boolean = false;
  _provider: DataProvider;
  _providerResult: InitializationResult;
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
  _error: ?Error;
  _waitToReportErrorPromise: ?Promise<void>;
  _startCalled: boolean = false;
  // Calls to this._listener must not happen concurrently, and we want them to happen
  // deterministically so we put them in a FIFO queue.
  _emitStateQueue: Queue = new Queue(1);
  _bobjectsEnabled: boolean;

  constructor(provider: DataProvider, client: AutomatedRunClient) {
    this._provider = provider;
    this._speed = client.speed;
    this._msPerFrame = client.msPerFrame;
    this._client = client;
    this._bobjectsEnabled = getExperimentalFeature("useBinaryTranslation");
    // Report errors from sendNotification and those thrown on the window object to the client.
    setNotificationHandler(
      (message: string, details: DetailsType, type: NotificationType, severity: NotificationSeverity) => {
        if (severity === "warn") {
          // We can ignore warnings in automated runs
          return;
        }
        let error;
        if (type === "user") {
          error = new Error(`${USER_ERROR_PREFIX} ${message} // ${detailsToString(details)}`);
        } else if (type === "app") {
          error = new Error(`[WEBVIZ APPLICATION ERROR] ${detailsToString(details)}`);
        } else {
          (type: void);
          error = new Error(`Unknown error type! ${type} // ${detailsToString(details)}`);
        }
        this._error = error;
        this._waitToReportErrorPromise = client.onError(error);
      }
    );
    window.addEventListener("error", (e: Error) => {
      this._error = e;
      this._waitToReportErrorPromise = client.onError(e);
    });
  }

  async _getMessages(
    start: Time,
    end: Time
  ): Promise<{ parsedMessages: $ReadOnlyArray<Message>, bobjects: $ReadOnlyArray<BobjectMessage> }> {
    const parsedTopics = getSanitizedTopics(this._parsedTopics, this._providerResult.topics);
    const bobjectTopics = getSanitizedTopics(this._bobjectTopics, this._providerResult.topics);
    if (parsedTopics.length === 0 && bobjectTopics.length === 0) {
      return { parsedMessages: [], bobjects: [] };
    }
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
        const topic: ?Topic = this._providerResult.topics.find((t) => t.name === message.topic);
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
    const filteredParsedMessages = filterMessages(parsedMessages);
    const filteredBobjects = this._bobjectsEnabled ? filterMessages(bobjects) : [];

    return { parsedMessages: filteredParsedMessages, bobjects: filteredBobjects };
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
          currentTime,
          startTime: this._providerResult.start,
          endTime: this._providerResult.end,
          isPlaying: this._isPlaying,
          speed: this._speed,
          messageOrder: "receiveTime",
          lastSeekTime: 0,
          topics: this._providerResult.topics,
          datatypes: this._providerResult.datatypes,
          messageDefinitionsByTopic: this._providerResult.messageDefinitionsByTopic,
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
          case "performance":
            // Don't need analytics for data provider callbacks in video generation.
            break;
          case "initializationPerformance":
            break;
          default:
            (metadata.type: empty);
        }
      },
    });

    await this._start();
  }

  async _start() {
    // Call _getMessages to start data loading and rendering for the first frame.
    const { parsedMessages, bobjects } = await this._getMessages(
      this._providerResult.start,
      this._providerResult.start
    );
    await this._emitState(parsedMessages, bobjects, this._providerResult.start);
    if (!this._startCalled) {
      this._client.markPreloadStart();
    }

    this._startCalled = true;
    this._maybeStartPlayback();
  }

  async _onUpdateProgress() {
    if (this._client.shouldLoadDataBeforePlaying && this._providerResult != null) {
      // Update the view and do preloading calculations. Not necessary if we're already playing.
      this._emitState([], [], this._providerResult.start);
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
    await this._emitState([], [], this._providerResult.start);

    let currentTime = this._providerResult.start;
    const bagLengthMs = toMillis(subtractTimes(this._providerResult.end, this._providerResult.start));
    this._client.start({ bagLengthMs });

    const nsBagTimePerFrame = Math.round(this._msPerFrame * this._speed * 1000000);
    const startEpoch = Date.now();

    let frameCount = 0;
    while (TimeUtil.isLessThan(currentTime, this._providerResult.end)) {
      if (this._waitToReportErrorPromise) {
        await this._waitToReportErrorPromise;
      }
      const end = TimeUtil.add(currentTime, { sec: 0, nsec: nsBagTimePerFrame });

      this._client.markTotalFrameStart();

      const { parsedMessages, bobjects } = await this._getMessages(currentTime, end);
      this._client.markFrameRenderStart();

      // Wait for the frame render to finish.
      await this._emitState(parsedMessages, bobjects, end);

      this._client.markTotalFrameEnd();
      const frameRenderDurationMs = this._client.markFrameRenderEnd();

      const bagTimeSinceStartMs = toMillis(subtractTimes(currentTime, this._providerResult.start));
      const percentComplete = bagTimeSinceStartMs / bagLengthMs;
      const msPerPercent = (Date.now() - startEpoch) / percentComplete;
      const estimatedSecondsRemaining = Math.round(((1 - percentComplete) * msPerPercent) / 1000);
      const eta = formatSeconds(Math.min(estimatedSecondsRemaining || 0, 24 * 60 * 60 /* 24 hours */));
      console.log(
        `Recording ${(percentComplete * 100).toFixed(1)}% done. ETA: ${eta}. Frame took ${frameRenderDurationMs}ms`
      );

      await this._client.onFrameFinished(frameCount);

      currentTime = TimeUtil.add(end, { sec: 0, nsec: 1 });
      frameCount++;
    }

    await this._client.finish();
    const totalDuration = (Date.now() - startEpoch) / 1000;
    console.log(`AutomatedRunPlayer finished in ${formatSeconds(totalDuration)}`);
  }

  /* Public API shared functions */

  requestMessages() {}

  setPublishers(_publishers: AdvertisePayload[]) {}

  publish(_payload: PublishPayload) {
    throw new Error(`Unsupported in AutomatedRunPlayer`);
  }

  async close() {
    throw new Error(`Unsupported in AutomatedRunPlayer`);
  }

  startPlayback() {
    throw new Error(`Unsupported in AutomatedRunPlayer`);
  }

  pausePlayback() {
    throw new Error(`Unsupported in AutomatedRunPlayer`);
  }

  setPlaybackSpeed(_speed: number, _backfillDuration: ?Time) {
    // This should be passed into the constructor and should not be changed.
  }

  seekPlayback(_time: Time) {
    throw new Error(`Unsupported in AutomatedRunPlayer`);
  }

  requestBackfill() {}
}
