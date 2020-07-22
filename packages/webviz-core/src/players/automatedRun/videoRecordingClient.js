// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import delay from "webviz-core/shared/delay";
import signal, { type Signal } from "webviz-core/shared/signal";

// This is the interface between the video recording server (recordVideo.js) and
// the client (whomever uses `videoRecordingClient`). The idea is that the server opens a webpage
// that runs a client, and from that point on, the client is in control. Essentially, the client
// makes remote procedure calls to the server, which the server executes and then acknowledges.
// Right now there are only three calls to the server:
// - "error" (which throws an error and aborts);
// - "finish" (to close the browser and generate the actual video);
// - "screenshot" (take a screenshot and acknowledge when done, so we can continue).
//

let screenshotResolve: ?() => void;
let finishedMsPerFrame: ?number;
let error: ?Error;
let errorSignal: ?Signal<void>;

export type VideoRecordingAction = {
  action: "error" | "finish" | "screenshot",
  error?: string,
  msPerFrame?: number,
};

window.videoRecording = {
  nextAction(): ?VideoRecordingAction {
    if (error) {
      // This object is serialized and deserialized to pass it to Puppeteer, so passing the error object itself will
      // just result in { "action": "error", "error": {} }. Instead pass a string - the stack itself.
      const payload = { action: "error", error: error.stack };
      // Clear error, since if it is whitelisted we will ignore and try to keep running
      error = null;
      if (errorSignal) {
        errorSignal.resolve();
        errorSignal = null;
      }
      return payload;
    }
    if (finishedMsPerFrame) {
      return { action: "finish", msPerFrame: finishedMsPerFrame };
    }
    if (screenshotResolve) {
      return { action: "screenshot" };
    }
    return null;
  },

  hasTakenScreenshot() {
    if (!screenshotResolve) {
      throw new Error("No screenshotResolve found!");
    }
    const resolve = screenshotResolve;
    screenshotResolve = undefined;
    resolve();
  },
};

const params = new URLSearchParams(location.search);
const msPerFrame = params.has("video-recording-framerate")
  ? 1000 / parseFloat(params.get("video-recording-framerate"))
  : 200;
const speed = params.has("video-recording-speed") ? parseFloat(params.get("video-recording-speed")) : 0.2;

class VideoRecordingClient {
  msPerFrame = msPerFrame;
  speed = speed;
  shouldLoadDataBeforePlaying = false;

  start() {
    console.log("videoRecordingClient.start()");
  }

  markFrameRenderStart() {}

  markFrameRenderEnd() {}

  markPreloadStart() {}

  markPreloadEnd() {}

  markTotalFrameStart() {}

  markTotalFrameEnd() {}

  onError(e: Error) {
    error = e;
    if (!errorSignal) {
      errorSignal = signal<void>();
    }
    return errorSignal;
  }

  async onFrameFinished(frameCount: number) {
    // Don't take screenshots of the first few frames, and then wait a bit,
    // to allow for the camera to get in position and images to load.
    if (frameCount < 5) {
      return;
    } else if (frameCount === 5) {
      await delay(3000);
      return;
    }

    await delay(60); // Give PlayerDispatcher time to dispatch a frame, and then render everything.
    if (screenshotResolve) {
      throw new Error("Already have a screenshot queued!");
    }
    return (new Promise((resolve) => {
      screenshotResolve = resolve;
    }): Promise<void>);
  }

  finish() {
    console.log("videoRecordingClient.finish()");
    finishedMsPerFrame = msPerFrame;
  }
}

export default new VideoRecordingClient();
