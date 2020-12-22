// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { omit } from "lodash";
import { TimeUtil, type Time } from "rosbag";

import RandomAccessPlayer, { SEEK_BACK_NANOSECONDS, SEEK_START_DELAY_MS } from "./RandomAccessPlayer";
import TestProvider from "./TestProvider";
import delay from "webviz-core/shared/delay";
import signal from "webviz-core/shared/signal";
import type { GetMessagesResult, GetMessagesTopics } from "webviz-core/src/dataProviders/types";
import {
  type Message,
  PlayerCapabilities,
  type PlayerMetricsCollectorInterface,
  type PlayerState,
} from "webviz-core/src/players/types";
import sendNotification from "webviz-core/src/util/sendNotification";
import { fromNanoSec, getSeekToTime, SEEK_ON_START_NS } from "webviz-core/src/util/time";

// By default seek to the start of the bag, since that makes things a bit simpler to reason about.
const playerOptions = { metricsCollector: undefined, seekToTime: { type: "absolute", time: { sec: 10, nsec: 0 } } };

class MessageStore {
  _messages: PlayerState[] = [];
  done: Promise<PlayerState[]>;
  _expected: number;
  _resolve: (PlayerState[]) => void;
  constructor(expected: number) {
    this._expected = expected;
    this.done = new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  add = (message: PlayerState): Promise<void> => {
    this._messages.push(omit(message, ["playerId"]));
    if (this._messages.length === this._expected) {
      this._resolve(this._messages);
    }
    if (this._messages.length > this._expected) {
      const error = new Error(`Expected: ${this._expected} messages, received: ${this._messages.length}`);
      this.done = Promise.reject(error);
      throw error;
    }
    return Promise.resolve();
  };

  reset = (expected: number): void => {
    this._expected = expected;
    this._messages = [];
    this.done = new Promise((resolve) => {
      this._resolve = resolve;
    });
  };
}

const getMessagesResult = { parsedMessages: [], bobjects: [], rosBinaryMessages: undefined };

describe("RandomAccessPlayer", () => {
  let mockDateNow;
  beforeEach(() => {
    mockDateNow = jest.spyOn(Date, "now").mockReturnValue(0);
    // Remove any seek-to param in the URL
    history.replaceState(null, window.title, location.pathname);
  });
  afterEach(async () => {
    mockDateNow.mockRestore();
    // Always wait to ensure that errors are contained to their own tests.
    await delay(SEEK_START_DELAY_MS + 10);
  });

  it("calls listener with player initial player state and data types", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    const store = new MessageStore(2);
    await source.setListener(store.add);
    const messages = await store.done;
    expect(messages).toEqual([
      {
        activeData: undefined,
        capabilities: [PlayerCapabilities.setSpeed],
        isPresent: true,
        progress: {},
        showInitializing: true,
        showSpinner: true,
      },
      {
        activeData: {
          currentTime: { sec: 10, nsec: 0 },
          datatypes: {
            baz: { fields: [{ name: "val", type: "number" }] },
            fooBar: { fields: [{ name: "val", type: "number" }] },
          },
          endTime: { sec: 100, nsec: 0 },
          isPlaying: false,
          lastSeekTime: 0,
          messages: [],
          bobjects: [],
          totalBytesReceived: 0,
          messageOrder: "receiveTime",
          speed: 0.2,
          startTime: { sec: 10, nsec: 0 },
          topics: [{ datatype: "fooBar", name: "/foo/bar" }, { datatype: "baz", name: "/baz" }],
          parsedMessageDefinitionsByTopic: {},
          playerWarnings: {},
        },
        capabilities: [PlayerCapabilities.setSpeed],
        isPresent: true,
        progress: {},
        showInitializing: false,
        showSpinner: false,
      },
    ]);
    // make sure capabilities don't change from one message to another
    expect(messages[0].capabilities).toBe(messages[1].capabilities);

    source.close();
  });

  it("with the default seekToTime it seeks into the bag by a bit, so that there's something useful on the screen", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(
      { name: "TestProvider", args: { provider }, children: [] },
      { ...playerOptions, seekToTime: getSeekToTime() }
    );
    const store = new MessageStore(2);
    await source.setListener(store.add);
    const messages: any = await store.done;
    expect(messages[1].activeData.currentTime).toEqual(
      TimeUtil.add({ sec: 10, nsec: 0 }, fromNanoSec(SEEK_ON_START_NS))
    );

    source.close();
  });

  it("calls listener with player state changes on play/pause", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    const store = new MessageStore(2);
    await source.setListener(store.add);
    // make getMessages do nothing since we're going to start reading
    provider.getMessages = () => new Promise(() => {});
    const messages = await store.done;
    expect(messages.map((msg) => (msg.activeData || {}).isPlaying)).toEqual([undefined, false]);
    store.reset(1);
    source.startPlayback();
    const messages2 = await store.done;
    expect(messages2.map((msg) => (msg.activeData || {}).isPlaying)).toEqual([true]);
    store.reset(1);
    source.startPlayback();
    source.pausePlayback();
    const messages3 = await store.done;
    expect(messages3.map((msg) => (msg.activeData || {}).isPlaying)).toEqual([false]);

    source.close();
  });

  it("calls listener with speed changes", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    const store = new MessageStore(2);
    await source.setListener(store.add);
    // allow initialization messages to come in
    await store.done;
    // wait for each playback speed change
    store.reset(1);
    source.setPlaybackSpeed(0.5);
    expect((await store.done).map((msg) => (msg.activeData || {}).speed)).toEqual([0.5]);
    store.reset(1);
    source.setPlaybackSpeed(1);
    expect((await store.done).map((msg) => (msg.activeData || {}).speed)).toEqual([1]);
    store.reset(1);
    source.setPlaybackSpeed(0.2);
    expect((await store.done).map((msg) => (msg.activeData || {}).speed)).toEqual([0.2]);

    source.close();
  });

  it("reads messages when playing back", async () => {
    expect.assertions(7);
    const provider = new TestProvider();
    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 10, nsec: 0 });
          expect(end).toEqual({ sec: 10, nsec: 0 });
          return Promise.resolve(getMessagesResult);

        case 2: {
          expect(start).toEqual({ sec: 10, nsec: 1 });
          expect(end).toEqual({ sec: 10, nsec: 4000000 });
          expect(topics).toEqual({ parsedMessages: ["/foo/bar"], bobjects: [] });
          const parsedMessages: Message[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 10, nsec: 2 },
              message: { payload: "foo bar" },
            },
          ];
          return Promise.resolve({ ...getMessagesResult, parsedMessages });
        }

        case 3: {
          expect(start).toEqual({ sec: 10, nsec: 4000001 });
          return Promise.resolve(getMessagesResult);
        }

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    const store = new MessageStore(5);
    await source.setListener(store.add);

    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    source.startPlayback();
    const messages = await store.done;
    // close the player to stop more reads
    source.close();

    const messagePayloads = messages.map((msg) => {
      const activeData = msg.activeData || {};
      return { messages: activeData.messages || [], bobjects: activeData.bobjects || [] };
    });
    expect(messagePayloads).toEqual([
      { messages: [], bobjects: [] },
      { messages: [], bobjects: [] },
      { messages: [], bobjects: [] },
      {
        messages: [
          {
            topic: "/foo/bar",
            receiveTime: { sec: 10, nsec: 2 },
            message: { payload: "foo bar" },
          },
        ],
        bobjects: [],
      },
      { messages: [], bobjects: [] },
    ]);
  });

  it("does not ask the data provider for data when it has no subscriptions", async () => {
    const provider = new TestProvider();
    provider.getMessages = (): Promise<GetMessagesResult> => {
      throw new Error("getMessages should not be called");
    };

    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    const store = new MessageStore(5);
    await source.setListener(store.add);

    source.setSubscriptions([]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    source.startPlayback();
    const messages = await store.done;
    // close the player to stop more reads
    source.close();

    const messagePayloads = messages.map((msg) => {
      const activeData = msg.activeData || {};
      return { messages: activeData.messages || [], bobjects: activeData.bobjects || [] };
    });
    expect(messagePayloads).toEqual([
      { messages: [], bobjects: [] }, // 1
      { messages: [], bobjects: [] }, // 2
      { messages: [], bobjects: [] }, // 3
      { messages: [], bobjects: [] }, // 4
      { messages: [], bobjects: [] }, // 5
    ]);
  });

  it("still moves forward time if there are no messages", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);

    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 10, nsec: 0 });
          expect(end).toEqual({ sec: 10, nsec: 0 });
          expect(topics).toEqual({ parsedMessages: ["/foo/bar"], bobjects: [] });
          return Promise.resolve(getMessagesResult);

        case 2:
          expect(start).toEqual({ sec: 10, nsec: 1 });
          expect(end).toEqual({ sec: 10, nsec: 4000000 });
          expect(topics).toEqual({ parsedMessages: ["/foo/bar"], bobjects: [] });
          source.pausePlayback();
          return Promise.resolve(getMessagesResult);

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(4);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    source.startPlayback();
    const messages = await store.done;
    // close the player to stop more reads
    source.close();
    const messagePayloads = messages.map((msg) => {
      const activeData = msg.activeData || {};
      return { messages: activeData.messages || [], bobjects: activeData.bobjects || [] };
    });
    expect(messagePayloads).toEqual([
      { messages: [], bobjects: [] },
      { messages: [], bobjects: [] },
      { messages: [], bobjects: [] },
      { messages: [], bobjects: [] },
    ]);
  });

  it("pauses and does not emit messages after pause", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);

    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 10, nsec: 0 });
          expect(end).toEqual({ sec: 10, nsec: 0 });
          expect(topics).toEqual({ parsedMessages: ["/foo/bar"], bobjects: [] });
          return Promise.resolve(getMessagesResult);

        case 2: {
          expect(start).toEqual({ sec: 10, nsec: 1 });
          expect(end).toEqual({ sec: 10, nsec: 4000000 });
          expect(topics).toEqual({ parsedMessages: ["/foo/bar"], bobjects: [] });
          const parsedMessages: Message[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 10, nsec: 0 },
              message: { payload: "foo bar" },
            },
          ];
          return Promise.resolve({ ...getMessagesResult, parsedMessages });
        }

        case 3:
          source.pausePlayback();
          return Promise.resolve({
            ...getMessagesResult,
            parsedMessages: [
              {
                topic: "/foo/bar",
                receiveTime: start,
                message: "this message should not be emitted",
              },
            ],
          });

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(5);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.

    source.startPlayback();
    const messages = await store.done;
    const messagePayloads = messages.map((msg) => {
      const activeData = msg.activeData || {};
      return { messages: activeData.messages || [], bobjects: activeData.bobjects || [] };
    });
    expect(messagePayloads).toEqual([
      { messages: [], bobjects: [] },
      { messages: [], bobjects: [] },
      { messages: [], bobjects: [] },
      {
        messages: [
          {
            topic: "/foo/bar",
            receiveTime: { sec: 10, nsec: 0 },
            message: { payload: "foo bar" },
          },
        ],
        bobjects: [],
      },
      // this is the 'pause' messages payload - should be empty:
      { messages: [], bobjects: [] },
    ]);

    source.close();
  });

  it("seek during reading discards messages before seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    let callCount = 0;
    provider.getMessages = async (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      expect(topics).toEqual({ parsedMessages: ["/foo/bar"], bobjects: [] });
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 10, nsec: 0 });
          expect(end).toEqual({ sec: 10, nsec: 0 });
          return Promise.resolve(getMessagesResult);
        case 2: {
          expect(start).toEqual({ sec: 10, nsec: 1 });
          expect(end).toEqual({ sec: 10, nsec: 4000000 });
          const parsedMessages: Message[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 10, nsec: 0 },
              message: { payload: "foo bar" },
            },
          ];
          await delay(10);
          mockDateNow.mockReturnValue(Date.now() + 1);
          source.seekPlayback({ sec: 10, nsec: 0 });
          return Promise.resolve({ ...getMessagesResult, parsedMessages });
        }

        case 3:
          source.pausePlayback();
          return Promise.resolve({
            ...getMessagesResult,
            parsedMessages: [
              {
                topic: "/foo/bar",
                receiveTime: start,
                message: "this message should not be emitted",
              },
            ],
          });

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(4);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    source.startPlayback();

    const messages = await store.done;
    expect(messages).toHaveLength(4);
    const activeDatas = messages.map((msg) => msg.activeData || {});
    expect(activeDatas.map((d) => d.lastSeekTime)).toEqual([
      undefined, // "start up" message
      0,
      0,
      1, // The last emit should have a different seek time.
    ]);
    expect(activeDatas.map((d) => d.currentTime)).toEqual([
      undefined, // "start up" message
      { sec: 10, nsec: 0 },
      { sec: 10, nsec: 0 },
      { sec: 10, nsec: 0 },
    ]);
    expect(activeDatas.map((d) => ({ messages: d.messages, bobjects: d.bobjects }))).toEqual([
      { messages: undefined, bobjects: undefined },
      { messages: [], bobjects: [] },
      { messages: [], bobjects: [] },
      { messages: [], bobjects: [] },
    ]);

    source.close();
  });

  it("only emits a new lastSeekTime when seeking is actually done", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    let callCount = 0;
    provider.getMessages = async (): Promise<GetMessagesResult> => {
      callCount++;
      switch (callCount) {
        case 1: {
          // This is the getMessages call from `seekPlayback`

          // Simulate a progress callback while we are waiting for `getMessages`
          provider.extensionPoint.progressCallback({});
          await delay(1);
          // The actual message is irrelevant
          const parsedMessages: Message[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 10, nsec: 5 },
              message: { payload: "foo bar" },
            },
          ];
          return { ...getMessagesResult, parsedMessages };
        }
        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(2);
    source.setListener(store.add);
    await store.done;
    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);

    store.reset(2);

    mockDateNow.mockReturnValue(Date.now() + 1);
    source.seekPlayback({ sec: 20, nsec: 50 });

    const messages = await store.done;
    const seekTimeAndMessages = messages.map(({ activeData }) => ({
      lastSeekTime: activeData?.lastSeekTime,
      messages: activeData?.messages,
      bobjects: activeData?.bobjects,
    }));
    expect(seekTimeAndMessages).toEqual([
      // This is from the progress callback - the seek time should not yet be incremented.
      { lastSeekTime: 0, messages: [], bobjects: [] },
      // This is from the seek - the seek time should now be incremented and we should have new messages alongside it.
      {
        lastSeekTime: 1,
        messages: [
          {
            topic: "/foo/bar",
            receiveTime: { sec: 10, nsec: 5 },
            message: { payload: "foo bar" },
          },
        ],
        bobjects: [],
      },
    ]);

    source.close();
    await delay(1);
  });

  it("does not emit when getting a progressCallback when playing", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    let callCount = 0;
    const progressDuringPlayback: any = { duringPlayback: true };
    const progressAfterPause: any = { afterPause: true };
    provider.getMessages = async (): Promise<GetMessagesResult> => {
      callCount++;
      switch (callCount) {
        case 1: {
          // This is the getMessages call from the playback tick
          // Simulate a progress callback while we are playing
          provider.extensionPoint.progressCallback(progressDuringPlayback);
          await delay(1);
          // The actual message is irrelevant
          const parsedMessages: Message[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 10, nsec: 5 },
              message: { payload: "foo bar" },
            },
          ];
          return { ...getMessagesResult, parsedMessages };
        }
        case 2: {
          source.pausePlayback();
          await delay(1);
          provider.extensionPoint.progressCallback(progressAfterPause);
          return getMessagesResult;
        }
        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(2);
    source.setListener(store.add);
    await store.done;
    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);

    store.reset(4);

    source.startPlayback();
    await delay(1);
    await delay(1);
    await delay(1);

    const messages = await store.done;
    const messagesAndIsPlaying = messages.map(({ activeData, progress }) => ({
      progress,
      messages: activeData?.messages,
      isPlaying: activeData?.isPlaying,
    }));
    expect(messagesAndIsPlaying).toEqual([
      // Initial emit for playing.
      { progress: {}, messages: [], isPlaying: true },
      // We should not get an emit from the progress callback.
      {
        progress: progressDuringPlayback,
        messages: [
          {
            topic: "/foo/bar",
            receiveTime: { sec: 10, nsec: 5 },
            message: { payload: "foo bar" },
          },
        ],
        isPlaying: true,
      },
      // One emit for pausing.
      { progress: progressDuringPlayback, messages: [], isPlaying: false },
      // Emit progress after pausing.
      { progress: progressAfterPause, messages: [], isPlaying: false },
    ]);

    source.close();
    await delay(1);
  });

  it("backfills previous messages on seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      callCount++;
      switch (callCount) {
        case 1: {
          expect(start).toEqual({ sec: 19, nsec: 1e9 + 50 - SEEK_BACK_NANOSECONDS });
          expect(end).toEqual({ sec: 20, nsec: 50 });
          expect(topics).toEqual({ parsedMessages: ["/foo/bar"], bobjects: [] });
          const parsedMessages: Message[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 10, nsec: 5 },
              message: { payload: "foo bar" },
            },
          ];
          return Promise.resolve({ ...getMessagesResult, parsedMessages });
        }
        case 2:
          // make sure after we seek & read again we read exactly from the right nanosecond
          expect(start).toEqual({ sec: 20, nsec: 51 });
          return Promise.resolve({
            ...getMessagesResult,
            parsedMessages: [{ topic: "/foo/bar", receiveTime: { sec: 10, nsec: 101 }, message: { payload: "baz" } }],
          });
        case 3:
          source.pausePlayback();
          return Promise.resolve(getMessagesResult);
        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(2);
    source.setListener(store.add);
    const done = await store.done;
    expect(done).toEqual([
      expect.objectContaining({ activeData: undefined }),
      expect.objectContaining({ activeData: expect.any(Object) }),
    ]);

    store.reset(1);
    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    // Ensure results from the backfill always thrown away after the new seek, by making the lastSeekTime change.
    mockDateNow.mockReturnValue(Date.now() + 1);
    source.seekPlayback({ sec: 20, nsec: 50 });

    const messages = await store.done;
    expect(messages.map((msg) => (msg.activeData ? msg.activeData.messages : []))).toEqual([
      [
        {
          topic: "/foo/bar",
          receiveTime: { sec: 10, nsec: 5 },
          message: { payload: "foo bar" },
        },
      ],
    ]);
    expect(messages.map((msg) => (msg.activeData ? msg.activeData.bobjects : []))).toEqual([[]]);
    store.reset(3);
    source.startPlayback();
    const messages2 = await store.done;
    expect(messages2.map((msg) => (msg.activeData || {}).messages)).toEqual([
      [],
      [
        {
          topic: "/foo/bar",
          receiveTime: { sec: 10, nsec: 101 },
          message: { payload: "baz" },
        },
      ],
      [],
    ]);
    expect(messages2.map((msg) => (msg.activeData || {}).bobjects)).toEqual([[], [], []]);

    source.close();
  });

  it("discards backfilled messages if we started playing after the seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    let callCount = 0;
    let backfillPromiseCallback;
    provider.getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      callCount++;
      switch (callCount) {
        case 1: {
          expect(start).toEqual({ sec: 19, nsec: 1e9 + 50 - SEEK_BACK_NANOSECONDS });
          expect(end).toEqual({ sec: 20, nsec: 50 });
          expect(topics).toEqual({ parsedMessages: ["/foo/bar"], bobjects: [] });
          return new Promise((resolve) => {
            backfillPromiseCallback = resolve;
          });
        }
        case 2:
          // make sure after we seek & read again we read exactly from the right nanosecond
          expect(start).toEqual({ sec: 20, nsec: 51 });
          return Promise.resolve({
            ...getMessagesResult,
            parsedMessages: [{ topic: "/foo/bar", receiveTime: { sec: 20, nsec: 51 }, message: { payload: "baz" } }],
          });
        case 3:
          source.pausePlayback();
          return Promise.resolve(getMessagesResult);
        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(2);
    source.setListener(store.add);
    expect(await store.done).toEqual([
      expect.objectContaining({ activeData: undefined }),
      expect.objectContaining({ activeData: expect.any(Object) }),
    ]);

    store.reset(3);
    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    // Ensure results from the backfill always thrown away after the new seek, by making the lastSeekTime change.
    mockDateNow.mockReturnValue(Date.now() + 1);
    source.seekPlayback({ sec: 20, nsec: 50 });

    await delay(100);
    if (!backfillPromiseCallback) {
      throw new Error("backfillPromiseCallback should be set");
    }
    source.startPlayback();
    const messages = await store.done;
    expect(messages.map((msg) => (msg.activeData || {}).messages)).toEqual([
      [],
      [
        {
          topic: "/foo/bar",
          receiveTime: { sec: 20, nsec: 51 },
          message: { payload: "baz" },
        },
      ],
      [], // pausePlayback
    ]);
    expect(messages.map((msg) => (msg.activeData || {}).bobjects)).toEqual([[], [], []]);

    store.reset(0); // We expect 0 more messages; this will throw an error later if we received more.
    const result: Message = {
      topic: "/foo/bar",
      receiveTime: { sec: 10, nsec: 5 },
      message: { payload: "foo bar" },
    };
    backfillPromiseCallback({ ...getMessagesResult, parsedMessages: [result] });
    await delay(10);

    source.close();
  });

  it("clamps times passed to the DataProvider", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    let lastGetMessagesCall;
    const getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      return new Promise((resolve) => {
        lastGetMessagesCall = { start, end, topics, resolve };
      });
    };
    provider.getMessages = getMessages;

    await source.setListener(async () => {});
    source.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.

    // Resolve original seek.
    if (!lastGetMessagesCall) {
      throw new Error("lastGetMessagesCall not set");
    }
    lastGetMessagesCall.resolve(getMessagesResult);

    // Try to seek to a time before the start time
    source.seekPlayback({ sec: 0, nsec: 250 });
    await delay(1);
    if (!lastGetMessagesCall) {
      throw new Error("lastGetMessagesCall not set");
    }
    lastGetMessagesCall.resolve(getMessagesResult);
    expect(lastGetMessagesCall).toEqual({
      start: { sec: 10, nsec: 0 }, // Clamped to start
      end: { sec: 10, nsec: 0 }, // Clamped to start
      topics: { parsedMessages: ["/foo/bar"], bobjects: [] },
      resolve: expect.any(Function),
    });

    // Test clamping to end time.
    lastGetMessagesCall.resolve(getMessagesResult);
    source.seekPlayback(TimeUtil.add({ sec: 100, nsec: 0 }, { sec: 0, nsec: -100 }));
    lastGetMessagesCall.resolve(getMessagesResult);
    source.startPlayback();
    expect(lastGetMessagesCall).toEqual({
      start: { nsec: 999999901, sec: 99 },
      end: { nsec: 0, sec: 100 },
      topics: { parsedMessages: ["/foo/bar"], bobjects: [] },
      resolve: expect.any(Function),
    });

    source.close();
  });

  it("gets messages when requestBackfill is called", async () => {
    expect.assertions(5);
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);

    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(topics).toEqual({ parsedMessages: ["/foo/bar"], bobjects: [] });
          return Promise.resolve(getMessagesResult);

        case 2:
          expect(topics).toEqual({ parsedMessages: ["/foo/bar", "/baz"], bobjects: [] });
          return Promise.resolve(getMessagesResult);

        case 3: // The `requestBackfill` without a `setSubscriptions` is identical to the one above.
          expect(topics).toEqual({ parsedMessages: ["/foo/bar", "/baz"], bobjects: [] });
          return Promise.resolve(getMessagesResult);

        case 4:
          expect(topics).toEqual({ parsedMessages: ["/baz"], bobjects: [] });
          return Promise.resolve(getMessagesResult);

        // Never called with empty topics!

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(9);
    await source.setListener(store.add);
    await delay(1);
    source.setSubscriptions([
      { topic: "/foo/bar", format: "parsedMessages" },
      { topic: "/new/topic", format: "parsedMessages" },
    ]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    await delay(1);
    source.setSubscriptions([
      { topic: "/foo/bar", format: "parsedMessages" },
      { topic: "/baz", format: "parsedMessages" },
    ]);
    source.requestBackfill();
    await delay(1);
    source.requestBackfill(); // We can also get a requestBackfill without a `setSubscriptions`.
    await delay(1);
    source.setSubscriptions([
      { topic: "/new/topic", format: "parsedMessages" },
      { topic: "/baz", format: "parsedMessages" },
    ]);
    source.requestBackfill();
    await delay(1);
    source.setSubscriptions([{ topic: "/new/topic", format: "parsedMessages" }]);
    source.requestBackfill();
    await delay(1);
    source.startPlayback();
    await delay(1);
    const messages = await store.done;
    expect(messages.length).toEqual(9);

    source.close();
  });

  it("reads a bunch of messages", async () => {
    const provider = new TestProvider();
    const items: Message[] = [
      {
        topic: "/foo/bar",
        receiveTime: { sec: 10, nsec: 0 },
        message: { payload: "foo bar 1" },
      },
      {
        topic: "/baz",
        receiveTime: { sec: 10, nsec: 500 },
        message: { payload: "baz 1" },
      },
      {
        topic: "/baz",
        receiveTime: { sec: 10, nsec: 5000 },
        message: { payload: "baz 2" },
      },
      {
        topic: "/foo/bar",
        receiveTime: { sec: 10, nsec: 9000000 },
        message: { payload: "foo bar 2" },
      },
    ];
    let resolve;
    const done = new Promise((_resolve) => (resolve = _resolve));
    provider.getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      expect(topics).toEqual({ parsedMessages: ["/foo/bar", "/baz"], bobjects: [] });
      const next = items.shift();
      if (!next) {
        resolve();
        return Promise.resolve(getMessagesResult);
      }
      return Promise.resolve({ ...getMessagesResult, parsedMessages: [next] });
    };

    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    const messagesReceived = [];
    const bobjectsReceived = [];
    await source.setListener((msg) => {
      messagesReceived.push(...((msg.activeData || {}).messages || []));
      bobjectsReceived.push(...((msg.activeData || {}).bobjects || []));
      return Promise.resolve();
    });
    source.setSubscriptions([
      { topic: "/foo/bar", format: "parsedMessages" },
      { topic: "/baz", format: "parsedMessages" },
    ]);
    source.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    source.startPlayback();
    await done;
    source.pausePlayback();
    expect(messagesReceived).toEqual([
      {
        topic: "/foo/bar",
        receiveTime: { sec: 10, nsec: 0 },
        message: { payload: "foo bar 1" },
      },
      {
        topic: "/baz",
        receiveTime: { sec: 10, nsec: 500 },
        message: { payload: "baz 1" },
      },
      {
        topic: "/baz",
        receiveTime: { sec: 10, nsec: 5000 },
        message: { payload: "baz 2" },
      },
      {
        topic: "/foo/bar",
        receiveTime: { sec: 10, nsec: 9000000 },
        message: { payload: "foo bar 2" },
      },
    ]);
    expect(bobjectsReceived).toEqual([]);

    source.close();
  });

  it("closes provider when closed", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    await source.setListener(async () => {});
    await source.close();
    expect(provider.closed).toBe(true);
  });

  it("doesn't try to close provider after initialization error", async () => {
    class FailTestProvider extends TestProvider {
      initialize() {
        return Promise.reject(new Error("fake initialization failure"));
      }
    }
    const provider = new FailTestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);

    const store = new MessageStore(2);
    await source.setListener(store.add);
    expect(provider.closed).toBe(false);

    source.close();
    const messages = await store.done;
    expect(provider.closed).toBe(false);

    expect(messages).toEqual([
      expect.objectContaining({ showInitializing: true, activeData: undefined }),
      expect.objectContaining({ showInitializing: false, activeData: undefined }),
    ]);
    expect(sendNotification).toHaveBeenCalledWith("Error initializing player", expect.any(Error), "app", "error");
    // $FlowFixMe
    sendNotification.mockClear();
  });

  it("shows a spinner when a provider is reconnecting", (done) => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    source.setListener((state) => {
      if (!state.showInitializing) {
        if (!state.showSpinner) {
          setImmediate(() =>
            provider.extensionPoint.reportMetadataCallback({ type: "updateReconnecting", reconnecting: true })
          );
        } else {
          done();
        }
      }
      return Promise.resolve();
    });
  });

  it("waits for previous read to finish when pausing and playing again", async () => {
    const provider = new TestProvider();
    const getMessages = jest.fn();
    provider.getMessages = getMessages;

    const message1 = {
      topic: "/foo/bar",
      receiveTime: { sec: 10, nsec: 1 },
      message: { payload: "foo bar 1" },
    };
    const message2 = {
      topic: "/foo/bar",
      receiveTime: { sec: 10, nsec: 2 },
      message: { payload: "foo bar 2" },
    };

    const player = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    player.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.

    const firstGetMessagesCall = signal();
    const firstGetMessagesReturn = signal();
    const secondGetMessagesCall = signal();
    const secondGetMessagesReturn = signal();

    const messages1 = [message1];
    getMessages.mockImplementation(async () => {
      firstGetMessagesCall.resolve();
      await firstGetMessagesReturn;
      return Promise.resolve({ ...getMessagesResult, parsedMessages: messages1.splice(0, 1) });
    });

    const store = new MessageStore(2);
    await player.setListener(store.add);
    player.startPlayback();

    await firstGetMessagesCall;
    expect(getMessages.mock.calls).toEqual([
      [{ sec: 10, nsec: 1 }, { sec: 10, nsec: 4000000 }, { parsedMessages: ["/foo/bar"], bobjects: [] }],
    ]);

    expect(await store.done).toEqual([
      expect.objectContaining({ activeData: undefined }),
      expect.objectContaining({ activeData: expect.objectContaining({ isPlaying: true, messages: [], bobjects: [] }) }),
    ]);

    const messages2 = [message2];
    getMessages.mockImplementation(async () => {
      secondGetMessagesCall.resolve();
      await secondGetMessagesReturn;
      return Promise.resolve({ ...getMessagesResult, parsedMessages: messages2.splice(0, 1) });
    });
    store.reset(2);

    player.pausePlayback();
    player.startPlayback();

    expect(await store.done).toEqual([
      expect.objectContaining({
        activeData: expect.objectContaining({ isPlaying: false, messages: [], bobjects: [] }),
      }),
      expect.objectContaining({ activeData: expect.objectContaining({ isPlaying: true, messages: [], bobjects: [] }) }),
    ]);

    store.reset(1);

    // The second getMessages call should only happen once the first getMessages has returned
    await Promise.resolve();
    expect(getMessages).toHaveBeenCalledTimes(1);
    firstGetMessagesReturn.resolve();
    await secondGetMessagesCall;
    expect(getMessages).toHaveBeenCalledTimes(2);

    expect(await store.done).toEqual([
      expect.objectContaining({
        activeData: expect.objectContaining({
          isPlaying: true,
          messages: [expect.objectContaining(message1)],
          bobjects: [],
        }),
      }),
    ]);

    store.reset(1);
    secondGetMessagesReturn.resolve();
    expect(await store.done).toEqual([
      expect.objectContaining({
        activeData: expect.objectContaining({
          isPlaying: true,
          messages: [expect.objectContaining(message2)],
          bobjects: [],
        }),
      }),
    ]);

    store.reset(1);
    player.pausePlayback();
    expect(await store.done).toEqual([
      expect.objectContaining({
        activeData: expect.objectContaining({ isPlaying: false, messages: [], bobjects: [] }),
      }),
    ]);

    player.close();
  });

  describe("metrics collecting", () => {
    class TestMetricsCollector implements PlayerMetricsCollectorInterface {
      _initialized: number = 0;
      _played: number = 0;
      _paused: number = 0;
      _seeked: number = 0;
      _speed: number[] = [];

      playerConstructed(): void {}
      initialized(): void {
        this._initialized++;
      }
      play(_speed: number): void {
        this._played++;
      }
      seek(_time: Time): void {
        this._seeked++;
      }
      setSpeed(speed: number): void {
        this._speed.push(speed);
      }
      pause(): void {
        this._paused++;
      }
      setSubscriptions(): void {}
      close(): void {}
      recordDataProviderPerformance(): void {}
      recordDataProviderStall(): void {}
      recordPlaybackTime(_time: Time): void {}
      recordBytesReceived(_bytes: number): void {}
      recordUncachedRangeRequest(): void {}
      stats() {
        return {
          initialized: this._initialized,
          played: this._played,
          paused: this._paused,
          seeked: this._seeked,
          speed: this._speed,
        };
      }
      recordTimeToFirstMsgs(): void {}
      recordDataProviderInitializePerformance() {}
    }

    it("delegates to metricsCollector on actions", async () => {
      const provider = new TestProvider();
      provider.getMessages = () => Promise.resolve(getMessagesResult);

      const metricsCollector = new TestMetricsCollector();
      const source = new RandomAccessPlayer(
        { name: "TestProvider", args: { provider }, children: [] },
        { ...playerOptions, metricsCollector }
      );
      expect(metricsCollector.stats()).toEqual({
        initialized: 0,
        played: 0,
        paused: 0,
        seeked: 0,
        speed: [],
      });
      const listener = jest.fn().mockImplementation(async (_msg) => {
        // just discard messages
      });

      // player should initialize even if the listener promise hasn't resolved yet
      let resolveListener;
      listener.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          resolveListener = resolve;
        });
      });
      source.setListener(listener);
      // appease Flow
      if (!resolveListener) {
        throw new Error("listener wasn't called");
      }
      await Promise.resolve();
      expect(metricsCollector.stats()).toEqual({
        initialized: 1,
        played: 0,
        paused: 0,
        seeked: 0,
        speed: [],
      });
      resolveListener();
      await Promise.resolve();
      expect(metricsCollector.stats()).toEqual({
        initialized: 1,
        played: 0,
        paused: 0,
        seeked: 0,
        speed: [],
      });

      source.startPlayback();
      source.startPlayback();
      expect(metricsCollector.stats()).toEqual({
        initialized: 1,
        played: 1,
        paused: 0,
        seeked: 0,
        speed: [],
      });
      source.seekPlayback({ sec: 10, nsec: 500 });
      source.seekPlayback({ sec: 11, nsec: 0 });
      expect(metricsCollector.stats()).toEqual({
        initialized: 1,
        played: 1,
        paused: 0,
        seeked: 2,
        speed: [],
      });
      source.pausePlayback();
      source.pausePlayback();
      expect(metricsCollector.stats()).toEqual({
        initialized: 1,
        played: 1,
        paused: 1,
        seeked: 2,
        speed: [],
      });
      source.setPlaybackSpeed(0.5);
      source.setPlaybackSpeed(1);
      expect(metricsCollector.stats()).toEqual({
        initialized: 1,
        played: 1,
        paused: 1,
        seeked: 2,
        speed: [0.5, 1],
      });
    });
  });

  it("pauses when document visibility changes", async () => {
    const provider = new TestProvider();
    const getMessages = jest.fn();
    provider.getMessages = getMessages;

    const message1 = {
      topic: "/foo/bar",
      receiveTime: { sec: 10, nsec: 1 },
      message: { payload: "foo bar 1" },
    };

    const player = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    player.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.

    const firstGetMessagesCall = signal();
    const firstGetMessagesReturn = signal();

    const messages1 = [message1];
    getMessages.mockImplementation(async () => {
      firstGetMessagesCall.resolve();
      await firstGetMessagesReturn;
      return Promise.resolve({ ...getMessagesResult, parsedMessages: messages1.splice(0, 1) });
    });

    const store = new MessageStore(3);
    await player.setListener(store.add);
    player.startPlayback();

    await firstGetMessagesCall;
    expect(getMessages.mock.calls).toEqual([
      [{ sec: 10, nsec: 1 }, { sec: 10, nsec: 4000000 }, { parsedMessages: ["/foo/bar"], bobjects: [] }],
    ]);

    // $FlowFixMe defineProperty's flow type does not accept using `get` instead of `value`
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(await store.done).toEqual([
      expect.objectContaining({ activeData: undefined }),
      expect.objectContaining({ activeData: expect.objectContaining({ isPlaying: true, messages: [], bobjects: [] }) }),
      expect.objectContaining({
        activeData: expect.objectContaining({ isPlaying: false, messages: [], bobjects: [] }),
      }),
    ]);

    store.reset(1);

    // $FlowFixMe defineProperty's flow type does not accept using `get` instead of `value`
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(await store.done).toEqual([
      expect.objectContaining({ activeData: expect.objectContaining({ isPlaying: true, messages: [] }) }),
    ]);

    player.close();
  });

  it("seeks the player after starting", async () => {
    const provider = new TestProvider();
    provider.getMessages = jest.fn().mockImplementation(() => Promise.resolve(getMessagesResult));
    const player = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    const store = new MessageStore(2);
    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    player.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    await player.setListener(store.add);
    const firstMessages = await store.done;
    expect(firstMessages).toEqual([
      expect.objectContaining({ activeData: undefined }),
      // isPlaying is set to false to begin
      expect.objectContaining({
        activeData: expect.objectContaining({ isPlaying: false, messages: [], bobjects: [] }),
      }),
    ]);
    expect(provider.getMessages).toHaveBeenCalled();

    player.close();
  });

  it("does not seek until setListener is called to initialize the start and end time", async () => {
    const provider = new TestProvider();
    provider.getMessages = jest.fn().mockImplementation(() => Promise.resolve(getMessagesResult));
    const player = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    const store = new MessageStore(2);
    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    player.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.

    player.seekPlayback({ sec: 10, nsec: 0 });
    expect(provider.getMessages).not.toHaveBeenCalled();

    await player.setListener(store.add);
    player.seekPlayback({ sec: 10, nsec: 0 });
    expect(provider.getMessages).toHaveBeenCalled();

    player.close();
  });

  it("wraps playback when letting it play across the end boundary", async () => {
    const provider = new TestProvider();
    provider.getMessages = jest.fn().mockImplementation(() => Promise.resolve(getMessagesResult));
    const player = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
    const store = new MessageStore(2);
    player.setSubscriptions([{ topic: "/foo/bar", format: "parsedMessages" }]);
    player.requestBackfill(); // We always get a `requestBackfill` after each `setSubscriptions`.
    await player.setListener(store.add);
    await store.done;

    // Seek to just before the end.
    store.reset(1);
    player.seekPlayback(TimeUtil.add({ sec: 100, nsec: 0 }, { sec: 0, nsec: -1 }));
    await store.done;

    // Pause right after wrapping around, which happens to be on the second call.
    // Then play again, and see if we indeed wrap around properly.
    let callCount = 0;
    provider.getMessages = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        player.pausePlayback();
      }
      return Promise.resolve(getMessagesResult);
    });
    store.reset(3);
    player.startPlayback();
    await store.done;

    // $FlowFixMe - doesn't understand getMessages.mock
    expect(provider.getMessages.mock.calls).toEqual([
      [{ sec: 100, nsec: 0 }, { sec: 100, nsec: 0 }, { parsedMessages: ["/foo/bar"], bobjects: [] }],
      // We don't care too much about the `nsec` part since it might depend on playback speed.
      // As long as the start of the range is actually at the beginning of the source.
      [
        { sec: 10, nsec: expect.any(Number) },
        { sec: 10, nsec: expect.any(Number) },
        { parsedMessages: ["/foo/bar"], bobjects: [] },
      ],
    ]);

    player.close();
  });

  it("requests messages according to the requested formats", async () => {
    expect.assertions(1);
    const provider = new TestProvider({
      topics: [
        { name: "/parsed_topic", datatype: "dummy" },
        { name: "/parsed_and_binary_topic", datatype: "dummy" },
        { name: "/only_binary_topic", datatype: "dummy" },
      ],
    });
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);

    provider.getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      expect(topics).toEqual({
        parsedMessages: ["/parsed_topic", "/parsed_and_binary_topic"],
        bobjects: ["/parsed_and_binary_topic", "/only_binary_topic"],
      });
      return Promise.resolve(getMessagesResult);
    };

    const store = new MessageStore(2);
    await source.setListener(store.add);
    source.setSubscriptions([
      { topic: "/unknown_topic", format: "parsedMessages" }, // Shouldn't appear in getMessages at all!
      { topic: "/parsed_topic", format: "parsedMessages" },
      { topic: "/parsed_and_binary_topic", format: "parsedMessages" },
      { topic: "/parsed_and_binary_topic", format: "bobjects" },
      { topic: "/only_binary_topic", format: "bobjects" },
    ]);
    await store.done;
  });

  it("does not request messages when all subscribers set `preloadingFallback`", async () => {
    expect.assertions(1);
    const provider = new TestProvider({
      topics: [
        { name: "/streaming_parsed", datatype: "dummy" },
        { name: "/fallback_parsed", datatype: "dummy" },
        { name: "/streaming_and_fallback_parsed", datatype: "dummy" },
        { name: "/streaming_binary", datatype: "dummy" },
        { name: "/only_fallback_binary", datatype: "dummy" },
        { name: "/streaming_and_fallback_binary", datatype: "dummy" },
      ],
    });
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);

    provider.getMessages = (start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> => {
      expect(topics).toEqual({
        parsedMessages: ["/streaming_parsed", "/streaming_and_fallback_parsed"],
        bobjects: ["/streaming_binary", "/streaming_and_fallback_binary"],
      });
      return Promise.resolve(getMessagesResult);
    };

    const store = new MessageStore(2);
    await source.setListener(store.add);
    source.setSubscriptions([
      { topic: "/unknown_topic", format: "parsedMessages" }, // Shouldn't appear in getMessages at all!
      { topic: "/streaming_parsed", format: "parsedMessages" },
      { topic: "/only_fallback_parsed", format: "parsedMessages", preloadingFallback: true },
      { topic: "/streaming_and_fallback_parsed", format: "parsedMessages" },
      { topic: "/streaming_and_fallback_parsed", format: "parsedMessages", preloadingFallback: true },
      { topic: "/streaming_binary", format: "bobjects" },
      { topic: "/only_fallback_binary", format: "bobjects", preloadingFallback: true },
      { topic: "/streaming_and_fallback_binary", format: "bobjects" },
      { topic: "/streaming_and_fallback_binary", format: "bobjects", preloadingFallback: true },
    ]);
    await store.done;
  });

  describe("hasCachedRange", () => {
    it("handles an empty progress range", async () => {
      const provider = new TestProvider({ topics: [{ name: "/fallback_parsed", datatype: "dummy" }] });
      const player = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
      await player.setListener(async () => {});
      provider.extensionPoint.progressCallback({});

      expect(player.hasCachedRange({ sec: 10, nsec: 0 }, { sec: 10, nsec: 0 })).toBe(false);
    });

    it("handles non-empty progress ranges", async () => {
      const provider = new TestProvider({ topics: [{ name: "/fallback_parsed", datatype: "dummy" }] });
      const player = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, playerOptions);
      await player.setListener(async () => {});

      // Provider start/end is 10s/100s. Load from 55s to 100s.
      provider.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0.5, end: 1.0 }] });

      expect(player.hasCachedRange({ sec: 0, nsec: 0 }, { sec: 0, nsec: 1 })).toBe(false);
      expect(player.hasCachedRange({ sec: 0, nsec: 0 }, { sec: 100, nsec: 0 })).toBe(false);

      expect(player.hasCachedRange({ sec: 50, nsec: 0 }, { sec: 95, nsec: 0 })).toBe(false);
      expect(player.hasCachedRange({ sec: 55, nsec: 0 }, { sec: 95, nsec: 0 })).toBe(true);
      expect(player.hasCachedRange({ sec: 55, nsec: 0 }, { sec: 100, nsec: 0 })).toBe(true);
      expect(player.hasCachedRange({ sec: 90, nsec: 0 }, { sec: 101, nsec: 0 })).toBe(false);
    });
  });
});
