// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { omit } from "lodash";
import { TimeUtil, type Time } from "rosbag";

import RandomAccessPlayer, { SEEK_BACK_NANOSECONDS } from "./RandomAccessPlayer";
import {
  type ExtensionPoint,
  type InitializationResult,
  type MessageLike,
  type RandomAccessDataProvider,
} from "./types";
import delay from "webviz-core/shared/delay";
import {
  type PlayerMetricsCollectorInterface,
  type Topic,
  type PlayerState,
  PlayerCapabilities,
} from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

jest.mock("webviz-core/src/util/reportError");

type GetMessages = (start: Time, end: Time, topics: string[]) => Promise<MessageLike[]>;

const start = { sec: 0, nsec: 0 };
const end = { sec: 100, nsec: 0 };
const datatypes: RosDatatypes = {
  fooBar: [
    {
      name: "val",
      type: "number",
    },
  ],
  baz: [
    {
      name: "val",
      type: "number",
    },
  ],
};
const topics: Topic[] = [
  {
    name: "/foo/bar",
    datatype: "fooBar",
  },
  {
    name: "/baz",
    datatype: "baz",
  },
];
class TestProvider implements RandomAccessDataProvider {
  _start: Time;
  _end: Time;
  _topics: Topic[];
  _datatypes: RosDatatypes;
  extensionPoint: ExtensionPoint;
  closed: boolean = false;

  constructor() {
    this._start = start;
    this._end = end;
    this._topics = topics;
    this._datatypes = datatypes;
  }

  initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this.extensionPoint = extensionPoint;
    return Promise.resolve({
      start: this._start,
      end: this._end,
      topics: this._topics,
      datatypes: this._datatypes,
    });
  }

  getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
    throw new Error("not implemented");
  };

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

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

describe("RandomAccessPlayer", () => {
  let mockDateNow;
  beforeEach(() => {
    mockDateNow = jest.spyOn(Date, "now").mockReturnValue(0);
  });
  afterEach(() => {
    mockDateNow.mockRestore();
  });

  it("calls listener with player initial player state and data types", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
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
          currentTime: { sec: 0, nsec: 0 },
          datatypes: { baz: [{ name: "val", type: "number" }], fooBar: [{ name: "val", type: "number" }] },
          endTime: { sec: 100, nsec: 0 },
          isPlaying: false,
          lastSeekTime: 0,
          messages: [],
          speed: 0.2,
          startTime: { sec: 0, nsec: 0 },
          topics: [{ datatype: "fooBar", name: "/foo/bar" }, { datatype: "baz", name: "/baz" }],
        },
        capabilities: ["setSpeed"],
        isPresent: true,
        progress: {},
        showInitializing: false,
        showSpinner: false,
      },
    ]);
    // make sure capabilities don't change from one message to another
    expect(messages[0].capabilities).toBe(messages[1].capabilities);
  });

  it("calls listener with player state changes on play/pause", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
    const store = new MessageStore(2);
    await source.setListener(store.add);
    // make getMessages do nothing since we're going to start reading
    provider.getMessages = () => new Promise((resolve) => {});
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
  });

  it("calls listener with speed changes", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
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
  });

  it("reads messages when playing back", async () => {
    expect.assertions(6);
    const provider = new TestProvider();
    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 0, nsec: 0 });
          expect(end).toEqual({ sec: 0, nsec: 0 });
          return Promise.resolve([]);

        case 2: {
          expect(start).toEqual({ sec: 0, nsec: 1 });
          expect(end).toEqual({ sec: 0, nsec: 4000000 });
          expect(topics).toEqual(["/foo/bar"]);
          const result: MessageLike[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 0, nsec: 2 },
              message: { payload: "foo bar" },
            },
          ];
          return Promise.resolve(result);
        }

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
    const store = new MessageStore(6);
    await source.setListener(store.add);

    source.setSubscriptions([{ topic: "/foo/bar" }]);
    source.startPlayback();
    const messages = await store.done;
    // close the player to stop more reads
    source.close();

    const messagePayloads = messages.map((msg) => (msg.activeData || {}).messages || []);
    expect(messagePayloads).toEqual([
      [],
      [],
      [],
      [],
      [
        {
          op: "message",
          topic: "/foo/bar",
          datatype: "fooBar",
          receiveTime: { sec: 0, nsec: 2 },
          message: { payload: "foo bar" },
        },
      ],
      [],
    ]);
  });

  it("still moves forward time if there are no messages", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });

    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 0, nsec: 0 });
          expect(end).toEqual({ sec: 0, nsec: 0 });
          expect(topics).toContainOnly(["/foo/bar"]);
          return Promise.resolve([]);

        case 2:
          expect(start).toEqual({ sec: 0, nsec: 2 });
          expect(end).toEqual({ sec: 0, nsec: 4000001 });
          expect(topics).toEqual(["/foo/bar"]);
          source.pausePlayback();
          return Promise.resolve([]);

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(5);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    source.startPlayback();
    const messages = await store.done;
    // close the player to stop more reads
    source.close();
    const messagePayloads = messages.map((msg) => (msg.activeData || {}).messages || []);
    expect(messagePayloads).toEqual([[], [], [], [], []]);
  });

  it("pauses and does not emit messages after pause", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });

    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 0, nsec: 0 });
          expect(end).toEqual({ sec: 0, nsec: 0 });
          expect(topics).toContainOnly(["/foo/bar"]);
          return Promise.resolve([]);

        case 2: {
          expect(start).toEqual({ sec: 0, nsec: 1 });
          expect(end).toEqual({ sec: 0, nsec: 4000000 });
          expect(topics).toContainOnly(["/foo/bar"]);
          const result: MessageLike[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 0, nsec: 0 },
              message: { payload: "foo bar" },
            },
          ];
          return Promise.resolve(result);
        }

        case 3:
          source.pausePlayback();
          return Promise.resolve([
            {
              topic: "/foo/bar",
              receiveTime: start,
              message: "this message should not be emitted",
            },
          ]);

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(6);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar" }]);

    source.startPlayback();
    const messages = await store.done;
    const messagePayloads = messages.map((msg) => (msg.activeData || {}).messages || []);
    expect(messagePayloads).toEqual([
      [],
      [],
      [],
      [],
      [
        {
          op: "message",
          topic: "/foo/bar",
          datatype: "fooBar",
          receiveTime: { sec: 0, nsec: 0 },
          message: { payload: "foo bar" },
        },
      ],
      [], // this is the 'pause' messages payload - should be empty
    ]);
  });

  it("seek during reading discards messages before seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
    let callCount = 0;
    provider.getMessages = async (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      expect(topics).toContainOnly(["/foo/bar"]);
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 0, nsec: 0 });
          expect(end).toEqual({ sec: 0, nsec: 0 });
          expect(topics).toContainOnly(["/foo/bar"]);
          return Promise.resolve([]);
        case 2: {
          expect(start).toEqual({ sec: 0, nsec: 1 });
          expect(end).toEqual({ sec: 0, nsec: 4000000 });
          expect(topics).toContainOnly(["/foo/bar"]);
          const result: MessageLike[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 0, nsec: 0 },
              message: { payload: "foo bar" },
            },
          ];
          await new Promise((resolve) => setTimeout(resolve, 10));
          mockDateNow.mockReturnValue(Date.now() + 1);
          source.seekPlayback({ sec: 0, nsec: 0 });
          return Promise.resolve(result);
        }

        case 3:
          source.pausePlayback();
          return Promise.resolve([
            {
              topic: "/foo/bar",
              receiveTime: start,
              message: "this message should not be emitted",
            },
          ]);

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(6);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    source.startPlayback();

    const messages = await store.done;
    expect(messages).toHaveLength(6);
    const activeDatas = messages.map((msg) => msg.activeData || {});
    expect(activeDatas.map((d) => d.currentTime)).toEqual([
      undefined, // "start up" message
      { sec: 0, nsec: 0 },
      { sec: 0, nsec: 0 },
      { sec: 0, nsec: 0 },
      { sec: 0, nsec: 0 },
      { sec: 0, nsec: 0 },
    ]);
    expect(activeDatas.map((d) => d.messages)).toEqual([undefined, [], [], [], [], []]);
  });

  it("backfills previous messages on seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 0, nsec: 0 });
          expect(end).toEqual({ sec: 0, nsec: 0 });
          expect(topics).toContainOnly(["/foo/bar"]);
          return Promise.resolve([]);

        case 2: {
          expect(start).toEqual({ sec: 19, nsec: 1e9 + 50 - SEEK_BACK_NANOSECONDS });
          expect(end).toEqual({ sec: 20, nsec: 50 });
          expect(topics).toContainOnly(["/foo/bar"]);
          const result: MessageLike[] = [
            {
              topic: "/foo/bar",
              receiveTime: { sec: 0, nsec: 5 },
              message: { payload: "foo bar" },
            },
          ];
          return Promise.resolve(result);
        }
        case 3:
          // make sure after we seek & read again we read exactly from the right nanosecond
          expect(start).toEqual({ sec: 20, nsec: 51 });
          return Promise.resolve([
            { topic: "/foo/bar", receiveTime: { sec: 0, nsec: 101 }, message: { payload: "baz" } },
          ]);
        case 4:
          source.pausePlayback();
          return Promise.resolve([]);
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
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    // ensure results from the automatic backfill during setSubscriptions are always thrown away
    // after the new seek, by making the lastSeekTime change
    mockDateNow.mockReturnValue(Date.now() + 1);
    source.seekPlayback({ sec: 20, nsec: 50 });

    const messages = await store.done;
    expect(messages.map((msg) => (msg.activeData ? msg.activeData.messages : []))).toEqual([
      [],
      [],
      [
        {
          op: "message",
          datatype: "fooBar",
          topic: "/foo/bar",
          receiveTime: { sec: 0, nsec: 5 },
          message: { payload: "foo bar" },
        },
      ],
    ]);
    store.reset(3);
    source.startPlayback();
    const messages2 = await store.done;
    expect(messages2.map((msg) => (msg.activeData || {}).messages)).toEqual([
      [],
      [
        {
          topic: "/foo/bar",
          datatype: "fooBar",
          op: "message",
          receiveTime: { sec: 0, nsec: 101 },
          message: { payload: "baz" },
        },
      ],
      [],
    ]);
  });

  it("discards backfilled messages if we started playing after the seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
    let callCount = 0;
    let backfillPromiseCallback;
    provider.getMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(start).toEqual({ sec: 0, nsec: 0 });
          expect(end).toEqual({ sec: 0, nsec: 0 });
          expect(topics).toContainOnly(["/foo/bar"]);
          return Promise.resolve([]);

        case 2: {
          expect(start).toEqual({ sec: 19, nsec: 1e9 + 50 - SEEK_BACK_NANOSECONDS });
          expect(end).toEqual({ sec: 20, nsec: 50 });
          expect(topics).toContainOnly(["/foo/bar"]);
          return new Promise((resolve) => {
            backfillPromiseCallback = resolve;
          });
        }
        case 3:
          // make sure after we seek & read again we read exactly from the right nanosecond
          expect(start).toEqual({ sec: 20, nsec: 51 });
          return Promise.resolve([
            { topic: "/foo/bar", receiveTime: { sec: 20, nsec: 51 }, message: { payload: "baz" } },
          ]);
        case 4:
          source.pausePlayback();
          return Promise.resolve([]);
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

    store.reset(5);
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    // ensure results from the automatic backfill during setSubscriptions are always thrown away
    // after the new seek, by making the lastSeekTime change
    mockDateNow.mockReturnValue(Date.now() + 1);
    source.seekPlayback({ sec: 20, nsec: 50 });

    await delay(10);
    if (!backfillPromiseCallback) {
      throw new Error("backfillPromiseCallback should be set");
    }
    source.startPlayback();
    const messages = await store.done;
    expect(messages.map((msg) => (msg.activeData || {}).messages)).toEqual([
      [], // seek from setSubscriptions
      [], // seekPlayback
      [], // startPlayback
      [
        {
          topic: "/foo/bar",
          datatype: "fooBar",
          op: "message",
          receiveTime: { sec: 20, nsec: 51 },
          message: { payload: "baz" },
        },
      ],
      [], // pausePlayback
    ]);

    store.reset(0); // We expect 0 more messages; this will throw an error later if we received more.
    const result: MessageLike = {
      topic: "/foo/bar",
      receiveTime: { sec: 0, nsec: 5 },
      message: { payload: "foo bar" },
    };
    backfillPromiseCallback([result]);
    await delay(10);
  });

  it("clamps times passed to the DataProvider", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    let lastGetMessagesCall;
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      return new Promise((resolve) => {
        lastGetMessagesCall = { start, end, topics, resolve };
      });
    };
    provider.getMessages = getMessages;

    await source.setListener(async () => {});
    source.setSubscriptions([{ topic: "/foo/bar" }]);

    // Test clamping to start time.
    source.seekPlayback({ sec: 0, nsec: 100 });
    if (!lastGetMessagesCall) {
      throw new Error("lastGetMessagesCall not set");
    }
    lastGetMessagesCall.resolve([]);
    expect(lastGetMessagesCall).toEqual({
      start: { sec: 0, nsec: 0 },
      end: { sec: 0, nsec: 100 },
      topics: ["/foo/bar"],
      resolve: expect.any(Function),
    });

    // Test clamping to end time.
    lastGetMessagesCall.resolve([]);
    source.seekPlayback(TimeUtil.add({ sec: 100, nsec: 0 }, { sec: 0, nsec: -100 }));
    lastGetMessagesCall.resolve([]);
    source.startPlayback();
    expect(lastGetMessagesCall).toEqual({
      start: { nsec: 999999901, sec: 99 },
      end: { nsec: 0, sec: 100 },
      topics: ["/foo/bar"],
      resolve: expect.any(Function),
    });
  });

  it("gets messages when valid topics subscriptions changed", async () => {
    expect.assertions(6);
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });

    let callCount = 0;
    provider.getMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      switch (callCount) {
        case 1:
          // initial getMessages from player initialization
          expect(topics).toEqual(["/foo/bar"]);
          return Promise.resolve([]);

        case 2:
          expect(topics).toEqual(["/foo/bar", "/baz"]);
          return Promise.resolve([]);

        case 3:
          expect(topics).toEqual(["/baz"]);
          return Promise.resolve([]);

        case 4:
          expect(topics).toEqual([]);
          return Promise.resolve([]);

        case 5:
          expect(topics).toEqual([]);
          return Promise.resolve([]);

        default:
          throw new Error("getMessages called too many times");
      }
    };

    const store = new MessageStore(7);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar" }, { topic: "/new/topic" }]);
    source.setSubscriptions([{ topic: "/new/topic" }, { topic: "/foo/bar" }]); // should not trigger getMessages (valid topics are same)
    source.setSubscriptions([{ topic: "/foo/bar" }, { topic: "/baz" }]);
    source.setSubscriptions([{ topic: "/new/topic" }, { topic: "/baz" }]);
    source.setSubscriptions([{ topic: "/baz" }]); // should not trigger getMessages (valid topics are same)
    source.setSubscriptions([{ topic: "/new/topic" }]);
    source.startPlayback();
    const messages = await store.done;
    expect(messages.length).toEqual(7);
    source.close();
  });

  it("reads a bunch of messages", async () => {
    const provider = new TestProvider();
    const items: MessageLike[] = [
      {
        topic: "/foo/bar",
        receiveTime: { sec: 0, nsec: 0 },
        message: { payload: "foo bar 1" },
      },
      {
        topic: "/baz",
        receiveTime: { sec: 0, nsec: 500 },
        message: { payload: "baz 1" },
      },
      {
        topic: "/baz",
        receiveTime: { sec: 0, nsec: 5000 },
        message: { payload: "baz 2" },
      },
      {
        topic: "/foo/bar",
        receiveTime: { sec: 0, nsec: 9000000 },
        message: { payload: "foo bar 2" },
      },
    ];
    let resolve;
    const done = new Promise((_resolve) => (resolve = _resolve));
    provider.getMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      expect(topics).toContainOnly(["/foo/bar", "/baz"]);
      const next = items.shift();
      if (!next) {
        resolve();
        return Promise.resolve([]);
      }
      return Promise.resolve([next]);
    };

    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
    const received = [];
    await source.setListener((msg) => {
      received.push(...((msg.activeData || {}).messages || []));
      return Promise.resolve();
    });
    source.setSubscriptions([{ topic: "/foo/bar" }, { topic: "/baz" }]);
    source.startPlayback();
    await done;
    source.pausePlayback();
    expect(received).toEqual([
      {
        op: "message",
        datatype: "fooBar",
        topic: "/foo/bar",
        receiveTime: { sec: 0, nsec: 0 },
        message: { payload: "foo bar 1" },
      },
      {
        topic: "/baz",
        op: "message",
        datatype: "baz",
        receiveTime: { sec: 0, nsec: 500 },
        message: { payload: "baz 1" },
      },
      {
        topic: "/baz",
        op: "message",
        datatype: "baz",
        receiveTime: { sec: 0, nsec: 5000 },
        message: { payload: "baz 2" },
      },
      {
        topic: "/foo/bar",
        op: "message",
        datatype: "fooBar",
        receiveTime: { sec: 0, nsec: 9000000 },
        message: { payload: "foo bar 2" },
      },
    ]);
  });

  it("closes provider when closed", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
    await source.close();
    expect(provider.closed).toBe(true);
  });

  it("shows a spinner when a provider is reconnecting", (done) => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] });
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

  describe("metrics collecting", () => {
    class TestMetricsCollector implements PlayerMetricsCollectorInterface {
      _initialized: number = 0;
      _played: number = 0;
      _paused: number = 0;
      _seeked: number = 0;
      _speed: number[] = [];

      initialized(): void {
        this._initialized++;
      }
      play(speed: number): void {
        this._played++;
      }
      seek(time: Time): void {
        this._seeked++;
      }
      setSpeed(speed: number): void {
        this._speed.push(speed);
      }
      pause(): void {
        this._paused++;
      }
      close(): void {}
      recordPlaybackTime(time: Time): void {}
      recordBytesReceived(bytes: number): void {}
      stats() {
        return {
          initialized: this._initialized,
          played: this._played,
          paused: this._paused,
          seeked: this._seeked,
          speed: this._speed,
        };
      }
    }

    it("delegates to metricsCollector on actions", async () => {
      const provider = new TestProvider();
      provider.getMessages = () => Promise.resolve([]);

      const collector = new TestMetricsCollector();
      const source = new RandomAccessPlayer({ name: "TestProvider", args: { provider }, children: [] }, collector);
      expect(collector.stats()).toEqual({
        initialized: 0,
        played: 0,
        paused: 0,
        seeked: 0,
        speed: [],
      });
      const listener = jest.fn().mockImplementation(async (msg) => {
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
      expect(collector.stats()).toEqual({
        initialized: 1,
        played: 0,
        paused: 0,
        seeked: 0,
        speed: [],
      });
      resolveListener();
      await Promise.resolve();
      expect(collector.stats()).toEqual({
        initialized: 1,
        played: 0,
        paused: 0,
        seeked: 0,
        speed: [],
      });

      source.startPlayback();
      source.startPlayback();
      expect(collector.stats()).toEqual({
        initialized: 1,
        played: 1,
        paused: 0,
        seeked: 0,
        speed: [],
      });
      source.seekPlayback({ sec: 0, nsec: 500 });
      source.seekPlayback({ sec: 1, nsec: 0 });
      expect(collector.stats()).toEqual({
        initialized: 1,
        played: 1,
        paused: 0,
        seeked: 2,
        speed: [],
      });
      source.pausePlayback();
      source.pausePlayback();
      expect(collector.stats()).toEqual({
        initialized: 1,
        played: 1,
        paused: 1,
        seeked: 2,
        speed: [],
      });
      source.setPlaybackSpeed(0.5);
      source.setPlaybackSpeed(1);
      expect(collector.stats()).toEqual({
        initialized: 1,
        played: 1,
        paused: 1,
        seeked: 2,
        speed: [0.5, 1],
      });
    });
  });
});
