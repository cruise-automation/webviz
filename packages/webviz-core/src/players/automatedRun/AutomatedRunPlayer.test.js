// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import TestProvider from "../TestProvider";
import AutomatedRunPlayer, { type AutomatedRunClient, AUTOMATED_RUN_START_DELAY } from "./AutomatedRunPlayer";
import delay from "webviz-core/shared/delay";
import signal from "webviz-core/shared/signal";
import { type Progress } from "webviz-core/src/players/types";

class TestRunClient implements AutomatedRunClient {
  speed = 1;
  msPerFrame = 20000;
  shouldLoadDataBeforePlaying = false;

  finished = false;
  frameStarted = false;

  constructor({ shouldLoadDataBeforePlaying }: { shouldLoadDataBeforePlaying?: boolean } = {}) {
    this.shouldLoadDataBeforePlaying = shouldLoadDataBeforePlaying || false;
  }

  onError(err) {
    throw err;
  }
  start() {}
  markTotalFrameStart() {
    this.frameStarted = true;
  }
  markTotalFrameEnd() {}
  markFrameRenderStart() {}
  markFrameRenderEnd() {}
  async onFrameFinished() {}
  finish() {
    this.finished = true;
  }
}

/* eslint-disable no-underscore-dangle */
describe("AutomatedRunPlayer", () => {
  it("waits to start playing until all frames are loaded when shouldLoadDataBeforePlaying=true", async () => {
    const provider = new TestProvider({ getMessages: async () => [] });
    const client = new TestRunClient({ shouldLoadDataBeforePlaying: true });
    const player = new AutomatedRunPlayer(provider, client);
    player.setSubscriptions([{ topic: "/foo/bar" }]);
    await delay(AUTOMATED_RUN_START_DELAY + 1000);
    expect(player._initialized).toEqual(true);
    expect(player._isPlaying).toEqual(false);

    const unfinishedProgress: Progress = { fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }] };
    provider.extensionPoint.progressCallback(unfinishedProgress);
    expect(player._isPlaying).toEqual(false);

    const finishedProgress: Progress = { fullyLoadedFractionRanges: [{ start: 0, end: 1 }] };
    provider.extensionPoint.progressCallback(finishedProgress);
    expect(player._isPlaying).toEqual(true);
  });

  it("makes calls to getMessages with the correct frames", async () => {
    const frames = [];
    const provider = new TestProvider({
      getMessages: async (startTime, endTime) => {
        frames.push({ startTime, endTime });
        return [];
      },
    });
    const client = new TestRunClient();

    const player = new AutomatedRunPlayer(provider, client);
    player.setSubscriptions([{ topic: "/foo/bar" }]);
    await delay(AUTOMATED_RUN_START_DELAY + 1000);
    expect(player._initialized).toEqual(true);
    expect(player._isPlaying).toEqual(true);
    const listener = { signal: signal() };
    player.setListener((state) => {
      return listener.signal;
    });
    while (!client.finished) {
      // Resolve the previous emit promise, then go to the next frame.
      const previousEmitSignal = listener.signal;
      listener.signal = signal();
      previousEmitSignal.resolve();
      await delay(1);
    }
    expect(frames).toEqual([
      { startTime: { sec: 10, nsec: 0 }, endTime: { sec: 10, nsec: 0 } },
      { startTime: { sec: 10, nsec: 0 }, endTime: { sec: 30, nsec: 0 } },
      { startTime: { sec: 30, nsec: 1 }, endTime: { sec: 50, nsec: 1 } },
      { startTime: { sec: 50, nsec: 2 }, endTime: { sec: 70, nsec: 2 } },
      { startTime: { sec: 70, nsec: 3 }, endTime: { sec: 90, nsec: 3 } },
      { startTime: { sec: 90, nsec: 4 }, endTime: { sec: 100, nsec: 0 } },
    ]);
  });

  it("awaits the previous emit promise before calling getMessages", async () => {
    let getMessagesCallCount = 0;
    const getMessagesSignal = { signal: signal() };
    const provider = new TestProvider({
      getMessages: async (startTime, endTime) => {
        getMessagesCallCount++;
        return getMessagesSignal.signal;
      },
    });
    function resolveNextGetMessages() {
      const previousGetMessagesSignal = getMessagesSignal.signal;
      getMessagesSignal.signal = signal();
      previousGetMessagesSignal.resolve([]);
    }

    const client = new TestRunClient();

    const player = new AutomatedRunPlayer(provider, client);
    player.setSubscriptions([{ topic: "/foo/bar" }]);
    await delay(AUTOMATED_RUN_START_DELAY + 1000);
    const listener = { signal: signal() };
    player.setListener(() => {
      return listener.signal;
    });
    function resolveNextEmitState() {
      const previousEmitSignal = listener.signal;
      listener.signal = signal();
      previousEmitSignal.resolve();
    }

    // We make one getMessages call at the beginning that we have to resolve.
    resolveNextGetMessages();
    // Get us into the event loop.
    while (!client.frameStarted) {
      resolveNextEmitState();
      await delay(10);
    }
    // Make sure we've resolved our last emit state, so that there is no state waiting to go out.
    resolveNextEmitState();
    await delay(10);

    // Now we're in the run loop.
    // Reset the call count to 0.
    getMessagesCallCount = 0;
    resolveNextGetMessages();
    await delay(10);
    // Don't call getMessages until the previous listener has resolved.
    expect(getMessagesCallCount).toEqual(0);
    resolveNextEmitState();
    await delay(10);
    expect(getMessagesCallCount).toEqual(1);
  });
});
