// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import delay from "webviz-core/shared/delay";
import signal, { type Signal } from "webviz-core/shared/signal";
import { PLAYBACK_RANGE_START_KEY, PLAYBACK_RANGE_END_KEY } from "webviz-core/shared/url";
import {
  type VideoMetadata,
  type RecordingProgressEvent,
} from "webviz-core/src/players/automatedRun/AutomatedRunPlayer";
import { parseRosTimeStr } from "webviz-core/src/util/time";

// This is the interface between the video recording server (recordVideo.js) and
// the client (whomever uses `videoRecordingClient`). The idea is that the server opens a webpage
// that runs a client, and from that point on, the client is in control. Essentially, the client
// makes remote procedure calls to the server, which the server executes and then acknowledges.
//
// Right now there are only three calls to the server:
// - "error" (which throws an error and aborts);
// - "finish" (to close the browser and generate the actual video);
// - "screenshot" (take a screenshot and acknowledge when done, so we can continue).

let screenshotResolve: ?() => void;
let lastScreenshotProgressEvent: ?RecordingProgressEvent;
let finishedVideoMetadata: ?VideoMetadata;
let error: ?Error;
let errorSignal: ?Signal<void>;

export type VideoRecordingFinishAction = {
  action: "finish",
  metadata: VideoMetadata,
};
export type VideoRecordingScreenshotAction = {
  action: "screenshot",
  progressEvent: ?RecordingProgressEvent,
};

export type VideoRecordingErrorAction = {
  action: "error",
  error: string,
};
export type VideoRecordingAction =
  | VideoRecordingFinishAction
  | VideoRecordingScreenshotAction
  | VideoRecordingErrorAction;

window.videoRecording = {
  nextAction(): ?VideoRecordingAction {
    if (error) {
      // This object is serialized and deserialized to pass it to Puppeteer, so passing the error object itself will
      // just result in { "action": "error", "error": {} }. Instead pass a string - the stack itself.
      const payload = {
        action: "error",
        error: error.stack || error.message || (error.toString && error.toString()) || (error: any),
      };
      // Clear error, since if it is whitelisted we will ignore and try to keep running
      error = null;
      if (errorSignal) {
        errorSignal.resolve();
        errorSignal = null;
      }
      return payload;
    }
    if (finishedVideoMetadata) {
      return { action: "finish", metadata: finishedVideoMetadata };
    }
    if (screenshotResolve) {
      return { action: "screenshot", progressEvent: lastScreenshotProgressEvent };
    }
    return null;
  },

  hasTakenScreenshot() {
    if (!screenshotResolve || !lastScreenshotProgressEvent) {
      throw new Error("No screenshotResolve or lastScreenshotProgressEvent found!");
    }
    const resolve = screenshotResolve;
    screenshotResolve = undefined;
    resolve();
  },
};

const params = new URLSearchParams(location.search);
const durationMs = params.has("duration") ? parseFloat(params.get("duration")) * 1000 : undefined;
const [rangeStartRaw, rangeEndRaw] = [params.get(PLAYBACK_RANGE_START_KEY), params.get(PLAYBACK_RANGE_END_KEY)];
const [rangeStartTime, rangeEndTime] = [rangeStartRaw, rangeEndRaw].map(parseRosTimeStr);

const [workerIndex = 0, workerTotal = 1] = (params.get("video-recording-worker") || "0/1")
  .split("/")
  .map((n) => parseInt(n));
const msPerFrame = params.has("video-recording-framerate")
  ? 1000 / parseFloat(params.get("video-recording-framerate"))
  : 200;
const speed = params.has("video-recording-speed") ? parseFloat(params.get("video-recording-speed")) : 0.2;

class VideoRecordingClient {
  msPerFrame = msPerFrame;
  durationMs = durationMs;
  workerIndex = workerIndex;
  workerTotal = workerTotal;
  rangeStartTime = rangeStartTime;
  rangeEndTime = rangeEndTime;
  speed = speed;
  shouldLoadDataBeforePlaying = false;
  lastFrameStart = 0;
  preloadStart = 0;

  start({ bagLengthMs }: { bagLengthMs: number }) {
    console.log("videoRecordingClient.start()", bagLengthMs);
  }

  markFrameRenderStart() {
    this.lastFrameStart = performance.now();
  }

  markFrameRenderEnd() {
    return Math.round(performance.now() - this.lastFrameStart);
  }

  markPreloadStart() {
    this.preloadStart = performance.now();
  }

  markPreloadEnd() {
    const preloadDurationMs = performance.now() - this.preloadStart;
    const preloadTimeSec = (preloadDurationMs / 1000).toFixed(1);
    console.log(`[VideoRecordingClient] Preload duration: ${preloadTimeSec}s`);
    return preloadDurationMs;
  }

  markTotalFrameStart() {}

  markTotalFrameEnd() {}

  onError(e: Error) {
    error = e;
    if (!errorSignal) {
      errorSignal = signal<void>();
    }
    return errorSignal;
  }

  async onFrameFinished(progressEvent: RecordingProgressEvent) {
    await delay(60); // Give PlayerDispatcher time to dispatch a frame, and then render everything.
    if (screenshotResolve) {
      throw new Error("Already have a screenshot queued!");
    }
    return (new Promise((resolve) => {
      screenshotResolve = resolve;
      lastScreenshotProgressEvent = progressEvent;
    }): Promise<void>);
  }

  finish(metadata: VideoMetadata) {
    console.log("videoRecordingClient.finish()", finishedVideoMetadata);
    finishedVideoMetadata = metadata;
  }
}

export default new VideoRecordingClient();
