// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Queue from "promise-queue";
import { type Time, TimeUtil } from "rosbag";
import uuid from "uuid";

import type { DataProvider, DataProviderMetadata, InitializationResult } from "webviz-core/src/dataProviders/types";
import type {
  AdvertisePayload,
  Message,
  Player,
  PlayerState,
  Progress,
  PublishPayload,
  SubscribePayload,
  Topic,
} from "webviz-core/src/players/types";
import { USER_ERROR_PREFIX } from "webviz-core/src/util/globalConstants";
import Logger from "webviz-core/src/util/Logger";
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
  markFrameRenderEnd(): void;
  markPreloadStart(): void;
  markPreloadEnd(): void;
  onFrameFinished(frameIndex: number): Promise<void>;
  finish(): any;
}

export const AUTOMATED_RUN_START_DELAY = process.env.NODE_ENV === "test" ? 10 : 2000;
const NO_WARNINGS = Object.freeze({});

const logger = new Logger(__filename);

export default class AutomatedRunPlayer implements Player {
  static className = "AutomatedRunPlayer";
  _isPlaying: boolean = false;
  _provider: DataProvider;
  _providerResult: InitializationResult;
  _progress: Progress;
  _topics: Set<string> = new Set();
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

  constructor(provider: DataProvider, client: AutomatedRunClient) {
    this._provider = provider;
    this._speed = client.speed;
    this._msPerFrame = client.msPerFrame;
    this._client = client;
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

  async _getMessages(start: Time, end: Time): Promise<Message[]> {
    const topics = getSanitizedTopics(this._topics, this._providerResult.topics);
    if (topics.length === 0) {
      return [];
    }
    start = clampTime(start, this._providerResult.start, this._providerResult.end);
    end = clampTime(end, this._providerResult.start, this._providerResult.end);
    const messages = await this._provider.getMessages(start, end, topics);
    return messages.map((message) => {
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
  }

  _emitState(messages: Message[], currentTime: Time): Promise<void> {
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
    this._topics = new Set(subscriptions.map(({ topic }) => topic));

    // Wait with running until we've subscribed to a bunch of topics.
    clearTimeout(this._initializeTimeout);
    this._initializeTimeout = setTimeout(() => this._initialize(), AUTOMATED_RUN_START_DELAY);
  }

  async _initialize() {
    if (this._initialized) {
      return; // Prevent double loads.
    }
    this._initialized = true;
    logger.info(`AutomatedRunPlayer._initialize()`);

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
          default:
            (metadata.type: empty);
        }
      },
    });

    await this._start();
  }

  async _start() {
    // Call _getMessages to start data loading and rendering for the first frame.
    const messages = await this._getMessages(this._providerResult.start, this._providerResult.start);
    await this._emitState(messages, this._providerResult.start);
    if (!this._startCalled) {
      this._client.markPreloadStart();
    }

    this._startCalled = true;
    this._maybeStartPlayback();
  }

  async _onUpdateProgress() {
    if (this._client.shouldLoadDataBeforePlaying && this._providerResult != null) {
      // Update the view and do preloading calculations. Not necessary if we're already playing.
      this._emitState([], this._providerResult.start);
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
    logger.info("AutomatedRunPlayer._run()");
    await this._emitState([], this._providerResult.start);

    let currentTime = this._providerResult.start;
    this._client.start({
      bagLengthMs: toMillis(subtractTimes(this._providerResult.end, this._providerResult.start)),
    });

    const nsBagTimePerFrame = Math.round(this._msPerFrame * this._speed * 1000000);

    let frameCount = 0;
    while (TimeUtil.isLessThan(currentTime, this._providerResult.end)) {
      if (this._waitToReportErrorPromise) {
        await this._waitToReportErrorPromise;
      }
      const end = TimeUtil.add(currentTime, { sec: 0, nsec: nsBagTimePerFrame });
      this._client.markTotalFrameStart();
      const messages = await this._getMessages(currentTime, end);

      this._client.markFrameRenderStart();
      // Wait for the frame render to finish.
      await this._emitState(messages, end);
      this._client.markTotalFrameEnd();
      this._client.markFrameRenderEnd();

      await this._client.onFrameFinished(frameCount);

      currentTime = TimeUtil.add(end, { sec: 0, nsec: 1 });
      frameCount++;
    }

    await this._client.finish();
    logger.info("AutomatedRunPlayer._run() finished");
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
