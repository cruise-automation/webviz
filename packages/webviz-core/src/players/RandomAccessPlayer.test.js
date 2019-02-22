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

import { TimeUtil, type Time } from "rosbag";

import RandomAccessPlayer, { SEEK_BACK_NANOSECONDS } from "./RandomAccessPlayer";
import {
  type ExtensionPoint,
  type InitializationResult,
  type MessageLike,
  type RandomAccessDataProvider,
} from "./types";
import { type PlayerMessage, type PlayerMetricsCollectorInterface, type TopicMsg } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { fromMillis } from "webviz-core/src/util/time";

type GetMessages = (start: Time, end: Time, topics: string[]) => Promise<MessageLike[]>;

const start = { sec: 0, nsec: 0 };
const end = { sec: 1, nsec: 0 };
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
const topics: TopicMsg[] = [
  {
    topic: "/foo/bar",
    datatype: "fooBar",
  },
  {
    topic: "/baz",
    datatype: "baz",
  },
];
class TestProvider implements RandomAccessDataProvider {
  _start: Time;
  _end: Time;
  _topics: TopicMsg[];
  _datatypes: RosDatatypes;
  extensionPoint: ExtensionPoint;
  closed: boolean = false;

  constructor() {
    this._start = start;
    this._end = end;
    this._topics = topics;
    this._datatypes = datatypes;
  }

  initialize(extensionPoint: ?ExtensionPoint): Promise<InitializationResult> {
    if (!extensionPoint) {
      throw new Error("RandomAccessPlayer should always pass in an extensionPoint");
    }
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
  _messages: PlayerMessage[] = [];
  done: Promise<PlayerMessage[]>;
  _expected: number;
  _resolve: (PlayerMessage[]) => void;
  constructor(expected: number) {
    this._expected = expected;
    this.done = new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  add = (message: PlayerMessage): Promise<void> => {
    this._messages.push(message);
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
}

describe("RandomAccessPlayer", () => {
  it("calls extension point topics callbacks when topics change", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const listener = (msg) => Promise.resolve();
    await source.setListener(listener);
    const extPoint = provider.extensionPoint;
    const topicCalls1 = [];
    const topicCalls2 = [];
    extPoint.addTopicsCallback((topics: string[]) => {
      topicCalls1.push(topics);
    });
    extPoint.addTopicsCallback((topics: string[]) => {
      topicCalls2.push(topics);
    });
    expect(topicCalls1).toEqual([]);
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    expect(topicCalls1).toEqual([["/foo/bar"]]);
    source.setSubscriptions([{ topic: "/foo/bar" }, { topic: "/foo/bar" }]);
    expect(topicCalls1).toEqual([["/foo/bar"]]);
    source.setSubscriptions([{ topic: "/foo/bar" }, { topic: "/foo/bar" }, { topic: "/baz" }]);
    expect(topicCalls1).toEqual([["/foo/bar"], ["/foo/bar", "/baz"]]);
    source.setSubscriptions([{ topic: "/baz" }]);
    expect(topicCalls1).toEqual([["/foo/bar"], ["/foo/bar", "/baz"], ["/baz"]]);
    expect(topicCalls2).toEqual(topicCalls1);
  });

  it("calls listener with player initial player state and data types", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const store = new MessageStore(6);
    await source.setListener(store.add);
    const messages = await store.done;
    expect(messages).toEqual([
      { op: "connecting", player: expect.any(RandomAccessPlayer) },
      { op: "capabilities", capabilities: ["seekBackfill", "initialization"] },
      { op: "datatypes", datatypes },
      { op: "connected" },
      { op: "topics", topics: [{ datatype: "fooBar", topic: "/foo/bar" }, { datatype: "baz", topic: "/baz" }] },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("calls listener with player state changes on play/pause", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const store = new MessageStore(8);
    await source.setListener(store.add);
    // make getMessages do nothing since we're going to start reading
    provider.getMessages = () => new Promise((resolve) => {});
    source.startPlayback();
    source.startPlayback();
    source.startPlayback();
    source.pausePlayback();
    source.pausePlayback();
    const messages = await store.done;
    expect(messages).toEqual([
      { op: "connecting", player: expect.any(RandomAccessPlayer) },
      { op: "capabilities", capabilities: ["seekBackfill", "initialization"] },
      { op: "datatypes", datatypes },
      { op: "connected" },
      { op: "topics", topics: [{ datatype: "fooBar", topic: "/foo/bar" }, { datatype: "baz", topic: "/baz" }] },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: true, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("calls listener with speed changes", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const store = new MessageStore(9);
    await source.setListener(store.add);
    source.setPlaybackSpeed(0.5);
    source.setPlaybackSpeed(1);
    source.setPlaybackSpeed(0.2);
    const messages = await store.done;
    expect(messages).toEqual([
      { op: "connecting", player: expect.any(RandomAccessPlayer) },
      { op: "capabilities", capabilities: ["seekBackfill", "initialization"] },
      { op: "datatypes", datatypes },
      { op: "connected" },
      { op: "topics", topics: [{ datatype: "fooBar", topic: "/foo/bar" }, { datatype: "baz", topic: "/baz" }] },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.5 },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 1 },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("reads messages when playing back", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const store = new MessageStore(8);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    let callCount = 0;
    let firstEnd;
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      if (callCount > 1) {
        // our second start should be exactly 1 nano after our first end
        expect(TimeUtil.compare(start, TimeUtil.add(firstEnd, { sec: 0, nsec: 1 }))).toBe(0);
        expect(TimeUtil.isGreaterThan(end, start)).toBeTruthy();
        return new Promise((resolve) => {});
      }
      firstEnd = end;
      expect(start).toEqual({ sec: 0, nsec: 0 });
      expect(end).toEqual(fromMillis(20 * 0.2));
      expect(topics).toContainOnly(["/foo/bar"]);
      const result: MessageLike[] = [
        {
          topic: "/foo/bar",
          receiveTime: { sec: 0, nsec: 0 },
          message: { payload: "foo bar" },
        },
      ];
      return Promise.resolve(result);
    };
    provider.getMessages = getMessages;
    source.startPlayback();
    const messages = await store.done;
    expect(messages).toEqual([
      { op: "connecting", player: expect.any(RandomAccessPlayer) },
      { op: "capabilities", capabilities: ["seekBackfill", "initialization"] },
      { op: "datatypes", datatypes },
      { op: "connected" },
      { op: "topics", topics: [{ datatype: "fooBar", topic: "/foo/bar" }, { datatype: "baz", topic: "/baz" }] },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: true, speed: 0.2 },
      {
        op: "message",
        topic: "/foo/bar",
        datatype: "fooBar",
        receiveTime: { sec: 0, nsec: 0 },
        message: { payload: "foo bar" },
      },
    ]);
  });

  it("still moves forward time if there are no messages", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const store = new MessageStore(8);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    let callCount = 0;
    let firstEnd;
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      if (callCount > 1) {
        // our second start should be exactly 1 nano after our first end
        expect(TimeUtil.compare(start, TimeUtil.add(firstEnd, { sec: 0, nsec: 1 }))).toBe(0);
        expect(TimeUtil.isGreaterThan(end, start)).toBeTruthy();
        return new Promise((resolve) => {});
      }
      firstEnd = end;
      expect(start).toEqual({ sec: 0, nsec: 0 });
      expect(end).toEqual(fromMillis(20 * 0.2));
      expect(topics).toContainOnly(["/foo/bar"]);
      return Promise.resolve([]);
    };
    provider.getMessages = getMessages;
    source.startPlayback();
    const messages = await store.done;
    expect(messages).toEqual([
      { op: "connecting", player: expect.any(RandomAccessPlayer) },
      { op: "capabilities", capabilities: ["seekBackfill", "initialization"] },
      { op: "datatypes", datatypes },
      { op: "connected" },
      { op: "topics", topics: [{ datatype: "fooBar", topic: "/foo/bar" }, { datatype: "baz", topic: "/baz" }] },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: true, speed: 0.2 },
      { op: "update_time", time: { sec: 0, nsec: 0 } },
    ]);
  });

  it("pauses and does not emit messages after pause", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const store = new MessageStore(9);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    let callCount = 0;
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      if (callCount > 1) {
        source.pausePlayback();
        return Promise.resolve([
          {
            topic: "/foo/bar",
            receiveTime: start,
            message: "this message should not be emitted",
          },
        ]);
      }
      expect(start).toEqual({ sec: 0, nsec: 0 });
      expect(end).toEqual(fromMillis(20 * 0.2));
      expect(topics).toContainOnly(["/foo/bar"]);
      const result: MessageLike[] = [
        {
          topic: "/foo/bar",
          receiveTime: { sec: 0, nsec: 0 },
          message: { payload: "foo bar" },
        },
      ];
      return Promise.resolve(result);
    };
    provider.getMessages = getMessages;
    source.startPlayback();
    const messages = await store.done;
    expect(messages).toEqual([
      { op: "connecting", player: expect.any(RandomAccessPlayer) },
      { op: "capabilities", capabilities: ["seekBackfill", "initialization"] },
      { op: "datatypes", datatypes },
      { op: "connected" },
      { op: "topics", topics: [{ datatype: "fooBar", topic: "/foo/bar" }, { datatype: "baz", topic: "/baz" }] },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: true, speed: 0.2 },
      {
        op: "message",
        topic: "/foo/bar",
        datatype: "fooBar",
        receiveTime: { sec: 0, nsec: 0 },
        message: { payload: "foo bar" },
      },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("seek during reading discards messages before seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const store = new MessageStore(10);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    let callCount = 0;
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      expect(topics).toContainOnly(["/foo/bar"]);
      callCount++;
      if (callCount > 1) {
        source.pausePlayback();
        return Promise.resolve([
          {
            topic: "/foo/bar",
            receiveTime: start,
            message: "this message should not be emitted",
          },
        ]);
      }

      expect(start).toEqual({ sec: 0, nsec: 0 });
      expect(end).toEqual(fromMillis(20 * 0.2));
      expect(topics).toContainOnly(["/foo/bar"]);
      source.seekPlayback({ sec: 0, nsec: 0 });
      const result: MessageLike[] = [
        {
          topic: "/foo/bar",
          receiveTime: { sec: 0, nsec: 0 },
          message: { payload: "foo bar" },
        },
      ];
      return Promise.resolve(result);
    };
    provider.getMessages = getMessages;
    source.startPlayback();
    const messages = await store.done;
    expect(messages).toEqual([
      { op: "connecting", player: expect.any(RandomAccessPlayer) },
      { op: "capabilities", capabilities: ["seekBackfill", "initialization"] },
      { op: "datatypes", datatypes },
      { op: "connected" },
      { op: "topics", topics: [{ datatype: "fooBar", topic: "/foo/bar" }, { datatype: "baz", topic: "/baz" }] },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: true, speed: 0.2 },
      { op: "seek" },
      { op: "update_time", time: { sec: 0, nsec: 0 } },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("backfills previous messages on seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const store = new MessageStore(9);
    await source.setListener(store.add);
    source.setSubscriptions([{ topic: "/foo/bar" }]);
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      expect(start).toEqual({ sec: 100, nsec: -SEEK_BACK_NANOSECONDS + 1 }); // + 1 because on backfill we include the requested time itself
      expect(end).toEqual({ sec: 100, nsec: 0 });
      expect(topics).toContainOnly(["/foo/bar"]);
      const result: MessageLike[] = [
        {
          topic: "/foo/bar",
          receiveTime: { sec: 100, nsec: 0 },
          message: { payload: "foo bar" },
        },
      ];
      return Promise.resolve(result);
    };
    provider.getMessages = getMessages;
    source.seekPlayback({ sec: 100, nsec: 0 });
    const messages = await store.done;
    expect(messages).toEqual([
      { op: "connecting", player: expect.any(RandomAccessPlayer) },
      { op: "capabilities", capabilities: ["seekBackfill", "initialization"] },
      { op: "datatypes", datatypes },
      { op: "connected" },
      { op: "topics", topics: [{ datatype: "fooBar", topic: "/foo/bar" }, { datatype: "baz", topic: "/baz" }] },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "seek" },
      { op: "update_time", time: { sec: 100, nsec: 1 } },
      {
        op: "message",
        datatype: "fooBar",
        topic: "/foo/bar",
        receiveTime: { sec: 100, nsec: 0 },
        message: { payload: "foo bar" },
      },
    ]);
  });

  it("reads a bunch of messages", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessPlayer(provider);
    const received = [];
    await source.setListener((msg) => {
      if (msg.op === "message") {
        received.push(msg);
      }
      return Promise.resolve();
    });
    source.setSubscriptions([{ topic: "/foo/bar" }, { topic: "/baz" }]);
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
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      expect(topics).toContainOnly(["/foo/bar", "/baz"]);
      const next = items.shift();
      if (!next) {
        resolve();
        return Promise.resolve([]);
      }
      return Promise.resolve([next]);
    };
    provider.getMessages = getMessages;
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
    const source = new RandomAccessPlayer(provider);
    await source.close();
    expect(provider.closed).toBe(true);
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
      play(): void {
        this._played++;
      }
      seek(): void {
        this._seeked++;
      }
      setSpeed(speed: number): void {
        this._speed.push(speed);
      }
      pause(): void {
        this._paused++;
      }
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
      const source = new RandomAccessPlayer(provider, collector);
      expect(collector.stats()).toEqual({
        initialized: 0,
        played: 0,
        paused: 0,
        seeked: 0,
        speed: [],
      });
      await source.setListener(async (msg) => {
        // just discard messages
      });
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
