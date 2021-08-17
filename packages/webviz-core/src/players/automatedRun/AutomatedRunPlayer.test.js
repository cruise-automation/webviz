// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { TimeUtil } from "rosbag";

import TestProvider, { defaultStart, defaultEnd } from "../TestProvider";
import AutomatedRunPlayer, { type AutomatedRunClient, AUTOMATED_RUN_START_DELAY } from "./AutomatedRunPlayer";
import delay from "webviz-core/shared/delay";
import signal from "webviz-core/shared/signal";
import { type Progress } from "webviz-core/src/players/types";
import sendNotification from "webviz-core/src/util/sendNotification";

class TestRunClient implements AutomatedRunClient {
  speed = 1;
  msPerFrame = 20000;
  rangeStartTime = undefined;
  rangeEndTime = undefined;
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
  markFrameRenderEnd() {
    return 0;
  }
  markPreloadStart = jest.fn();
  markPreloadEnd = jest.fn();
  async onFrameFinished() {}
  finish() {
    this.finished = true;
  }
}

const getMessagesResult = { parsedMessages: [], rosBinaryMessages: undefined, bobjects: [] };

/* eslint-disable no-underscore-dangle */
describe("AutomatedRunPlayer", () => {
  it("waits to start playing until all frames are loaded when shouldLoadDataBeforePlaying=true", async () => {
    const provider = new TestProvider({ getMessages: async () => getMessagesResult });
    const client = new TestRunClient({ shouldLoadDataBeforePlaying: true });
    const player = new AutomatedRunPlayer(provider, client);
    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    await delay(AUTOMATED_RUN_START_DELAY + 10);
    expect(player._initialized).toEqual(true);
    expect(player._isPlaying).toEqual(false);

    const unfinishedProgress: Progress = { fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }] };
    provider.extensionPoint.progressCallback(unfinishedProgress);
    expect(player._isPlaying).toEqual(false);

    const finishedProgress: Progress = { fullyLoadedFractionRanges: [{ start: 0, end: 1 }] };
    provider.extensionPoint.progressCallback(finishedProgress);
    expect(player._isPlaying).toEqual(true);
  });

  it("measures preloading performance", async () => {
    const provider = new TestProvider({ getMessages: async () => getMessagesResult });
    const client = new TestRunClient({ shouldLoadDataBeforePlaying: true });
    const player = new AutomatedRunPlayer(provider, client);
    let emitStateCalls = 0;
    player.setListener(async () => {
      emitStateCalls += 1;
    });

    expect(client.markPreloadStart.mock.calls.length).toBe(0);
    expect(client.markPreloadEnd.mock.calls.length).toBe(0);
    expect(emitStateCalls).toBe(0);

    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    await delay(AUTOMATED_RUN_START_DELAY + 10);

    // Preloading has started but not finished.
    expect(client.markPreloadStart.mock.calls.length).toBe(1);
    expect(client.markPreloadEnd.mock.calls.length).toBe(0);
    // _emitState called on initialization.
    expect(emitStateCalls).toBe(1);

    expect(player._initialized).toEqual(true);
    expect(player._isPlaying).toEqual(false);

    // Partially preloaded.
    provider.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }] });
    expect(player._isPlaying).toEqual(false);

    expect(client.markPreloadStart.mock.calls.length).toBe(1);
    expect(client.markPreloadEnd.mock.calls.length).toBe(0);
    // _emitState called on progress.
    expect(emitStateCalls).toBe(2);

    // Finish preloading.
    provider.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 1 }] });
    await delay(0);
    // Finished preloading.
    expect(client.markPreloadStart.mock.calls.length).toBe(1);
    expect(client.markPreloadEnd.mock.calls.length).toBe(1);
    // _emitState called on progress (and also during playback.)
    expect(emitStateCalls).toBeGreaterThan(2);
    expect(player._isPlaying).toEqual(true);
  });

  it("makes calls to getMessages with the correct frames", async () => {
    const frames = [];
    const provider = new TestProvider({
      getMessages: async (startTime, endTime) => {
        frames.push({ startTime, endTime });
        return getMessagesResult;
      },
    });
    const client = new TestRunClient();

    const player = new AutomatedRunPlayer(provider, client);
    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    await delay(AUTOMATED_RUN_START_DELAY + 10);
    expect(player._initialized).toEqual(true);
    expect(player._isPlaying).toEqual(true);
    const listener = { signal: signal() };
    player.setListener(() => {
      return listener.signal;
    });
    while (!client.finished) {
      // Resolve the previous emit promise, then go to the next frame.
      const previousEmitSignal = listener.signal;
      listener.signal = signal();
      previousEmitSignal.resolve();
      await delay(1);
    }
    expect(frames).toMatchSnapshot();
  });

  it("makes calls to getMessages within the provider's range", async () => {
    const provider = new TestProvider({
      getMessages: async (startTime, endTime) => {
        expect(TimeUtil.compare(startTime, defaultStart) >= 0).toBeTruthy();
        expect(TimeUtil.compare(endTime, defaultEnd) <= 0).toBeTruthy();
        return getMessagesResult;
      },
    });
    const client = new TestRunClient();
    client.msPerFrame = 500;
    const player = new AutomatedRunPlayer(provider, client);
    player.setMessageOrder("headerStamp");
    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    const listener = { signal: signal() };
    player.setListener(() => listener.signal);
    while (!client.finished) {
      // Resolve the previous emit promise, then go to the next frame.
      const previousEmitSignal = listener.signal;
      listener.signal = signal();
      previousEmitSignal.resolve();
      await delay(1);
    }
  });

  it("ignores warnings and info notifications", async () => {
    const provider = new TestProvider({ getMessages: async () => getMessagesResult });
    const client = new TestRunClient({ shouldLoadDataBeforePlaying: true });
    new AutomatedRunPlayer(provider, client);

    expect(() => {
      sendNotification("Some warning", "message", "user", "warn");
      sendNotification("Some info", "message", "user", "info");
    }).not.toThrow();
    sendNotification.expectCalledDuringTest();
  });

  async function setupEventLoopTest() {
    let getMessagesCallCount = 0;
    const getMessagesSignal = { signal: signal() };
    const provider = new TestProvider({
      getMessages: async () => {
        getMessagesCallCount++;
        return getMessagesSignal.signal;
      },
    });
    function resolveNextGetMessages() {
      const previousGetMessagesSignal = getMessagesSignal.signal;
      getMessagesSignal.signal = signal();
      previousGetMessagesSignal.resolve(getMessagesResult);
    }

    const listener = { signal: signal() };
    function resolveNextEmitState() {
      const previousEmitSignal = listener.signal;
      listener.signal = signal();
      previousEmitSignal.resolve();
    }

    const client = new TestRunClient();
    const player = new AutomatedRunPlayer(provider, client);
    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    await delay(AUTOMATED_RUN_START_DELAY + 10);
    player.setListener(() => listener.signal);

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

    return {
      player,
      client,
      resolveNextGetMessages,
      resolveNextEmitState,
      getGetMessagesCallCount: () => getMessagesCallCount,
    };
  }

  it("awaits the previous emit promise before calling getMessages", async () => {
    const { resolveNextGetMessages, resolveNextEmitState, getGetMessagesCallCount } = await setupEventLoopTest();

    resolveNextGetMessages();
    await delay(10);
    // Don't call getMessages until the previous listener has resolved.
    expect(getGetMessagesCallCount()).toEqual(0);
    resolveNextEmitState();
    await delay(10);
    expect(getGetMessagesCallCount()).toEqual(1);
  });
});
