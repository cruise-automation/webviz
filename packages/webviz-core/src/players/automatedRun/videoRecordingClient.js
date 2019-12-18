// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import delay from "webviz-core/shared/delay";

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

window.videoRecording = {
  nextAction() {
    if (error) {
      return { action: "error", error };
    }
    if (finishedMsPerFrame) {
      return { action: "finish", msPerFrame: finishedMsPerFrame };
    }
    if (screenshotResolve) {
      return { action: "screenshot" };
    }
    return false;
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

  markTotalFrameStart() {}

  markTotalFrameEnd() {}

  onError(e: Error) {
    error = e;
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
