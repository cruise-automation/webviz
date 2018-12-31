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

import { Time } from "rosbag";

import RandomAccessDataSource, { SEEK_BACK_SECONDS } from "./RandomAccessDataSource";
import { ExtensionPoint, type InitializationResult, type MessageLike } from "./types";
import {
  type DataSourceMessage,
  type DataSourceMetricsCollectorInterface,
  type TopicMsg,
} from "webviz-core/src/types/dataSources";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { fromMillis } from "webviz-core/src/util/time";

type GetMessages = (start: Time, end: Time, topics: string[]) => Promise<MessageLike[]>;

const start = new Time(0, 0);
const end = new Time(1, 0);
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
class TestProvider {
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

  initialize(extPoint: ExtensionPoint): Promise<InitializationResult> {
    this.extensionPoint = extPoint;
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
  _messages: DataSourceMessage[] = [];
  done: Promise<DataSourceMessage[]>;
  _expected: number;
  _resolve: (DataSourceMessage[]) => void;
  constructor(expected: number) {
    this._expected = expected;
    this.done = new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  add = (message: DataSourceMessage): Promise<void> => {
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

describe("RandomAccessDataSource", () => {
  it("calls initialze with listener on extension point", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const listener = (msg) => Promise.resolve();
    await source.setListener(listener);
    expect(provider.extensionPoint.messageCallback).toBe(listener);
  });

  it('calls extension point "topics" event when topics change', async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const listener = (msg) => Promise.resolve();
    await source.setListener(listener);
    const extPoint = provider.extensionPoint;
    const topicCalls = [];
    extPoint.on("topics", (topics: string[]) => {
      topicCalls.push(topics);
    });
    expect(topicCalls).toEqual([]);
    source.subscribe({ topic: "/foo/bar" });
    expect(topicCalls).toEqual([["/foo/bar"]]);
    source.subscribe({ topic: "/foo/bar" });
    expect(topicCalls).toEqual([["/foo/bar"]]);
    source.subscribe({ topic: "/baz" });
    expect(topicCalls).toEqual([["/foo/bar"], ["/foo/bar", "/baz"]]);
    source.unsubscribe({ topic: "/foo/bar" });
    source.unsubscribe({ topic: "/foo/bar" });
    source.unsubscribe({ topic: "/foo/bar" });
    expect(topicCalls).toEqual([["/foo/bar"], ["/foo/bar", "/baz"], ["/baz"]]);
  });

  it("calls listener with player initial player state and data types", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const store = new MessageStore(3);
    await source.setListener(store.add);
    const messages = await store.done;
    expect(messages).toContainOnly([
      { op: "capabilities", capabilities: ["seekBackfill"] },
      { op: "datatypes", datatypes },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("returns topics on topic request", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const store = new MessageStore(4);
    await source.setListener(store.add);
    source.requestTopics();
    const messages = await store.done;
    expect(messages).toContainOnly([
      { op: "capabilities", capabilities: ["seekBackfill"] },
      { op: "datatypes", datatypes },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "topics", topics: [{ topic: "/foo/bar", datatype: "fooBar" }, { topic: "/baz", datatype: "baz" }] },
    ]);
  });

  it("calls listener with player state changes on play/pause", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const store = new MessageStore(5);
    await source.setListener(store.add);
    // make getMessages do nothing since we're going to start reading
    provider.getMessages = () => new Promise((resolve) => {});
    source.startPlayback();
    source.startPlayback();
    source.startPlayback();
    source.pausePlayback();
    source.pausePlayback();
    const messages = await store.done;
    expect(messages).toContainOnly([
      { op: "capabilities", capabilities: ["seekBackfill"] },
      { op: "datatypes", datatypes },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: true, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("calls listener with speed changes", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const store = new MessageStore(6);
    await source.setListener(store.add);
    source.setPlaybackSpeed(0.5);
    source.setPlaybackSpeed(1);
    source.setPlaybackSpeed(0.2);
    const messages = await store.done;
    expect(messages).toContainOnly([
      { op: "capabilities", capabilities: ["seekBackfill"] },
      { op: "datatypes", datatypes },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.5 },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 1 },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("reads messages when playing back", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const store = new MessageStore(5);
    await source.setListener(store.add);
    source.subscribe({ topic: "/foo/bar" });
    let callCount = 0;
    let firstEnd;
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      callCount++;
      if (callCount > 1) {
        // our second start should be exactly 1 nano after our first end
        expect(Time.compare(start, Time.add(firstEnd, new Time(0, 1)))).toBe(0);
        expect(Time.isGreaterThan(end, start)).toBeTruthy();
        return new Promise((resolve) => {});
      }
      firstEnd = end;
      expect(start).toEqual(new Time(0, 0));
      expect(end).toEqual(fromMillis(20 * 0.2));
      expect(topics).toContainOnly(["/foo/bar"]);
      const result: MessageLike[] = [
        {
          topic: "/foo/bar",
          receiveTime: new Time(0, 0),
          message: { payload: "foo bar" },
        },
      ];
      return Promise.resolve(result);
    };
    provider.getMessages = getMessages;
    source.startPlayback();
    const messages = await store.done;
    expect(messages).toContainOnly([
      { op: "capabilities", capabilities: ["seekBackfill"] },
      { op: "datatypes", datatypes },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: true, speed: 0.2 },
      {
        op: "message",
        topic: "/foo/bar",
        datatype: "fooBar",
        receiveTime: new Time(0, 0),
        message: { payload: "foo bar" },
      },
    ]);
  });

  it("pauses and does not emit messages after pause", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const store = new MessageStore(6);
    await source.setListener(store.add);
    source.subscribe({ topic: "/foo/bar" });
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
      expect(start).toEqual(new Time(0, 0));
      expect(end).toEqual(fromMillis(20 * 0.2));
      expect(topics).toContainOnly(["/foo/bar"]);
      const result: MessageLike[] = [
        {
          topic: "/foo/bar",
          receiveTime: new Time(0, 0),
          message: { payload: "foo bar" },
        },
      ];
      return Promise.resolve(result);
    };
    provider.getMessages = getMessages;
    source.startPlayback();
    const messages = await store.done;
    expect(messages).toContainOnly([
      { op: "capabilities", capabilities: ["seekBackfill"] },
      { op: "datatypes", datatypes },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: true, speed: 0.2 },
      {
        op: "message",
        topic: "/foo/bar",
        datatype: "fooBar",
        receiveTime: new Time(0, 0),
        message: { payload: "foo bar" },
      },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("seek during reading discards messages before seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const store = new MessageStore(7);
    await source.setListener(store.add);
    source.subscribe({ topic: "/foo/bar" });
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

      expect(start).toEqual(new Time(0, 0));
      expect(end).toEqual(fromMillis(20 * 0.2));
      expect(topics).toContainOnly(["/foo/bar"]);
      source.seekPlayback(new Time(0, 0));
      const result: MessageLike[] = [
        {
          topic: "/foo/bar",
          receiveTime: new Time(0, 0),
          message: { payload: "foo bar" },
        },
      ];
      return Promise.resolve(result);
    };
    provider.getMessages = getMessages;
    source.startPlayback();
    const messages = await store.done;
    expect(messages).toContainOnly([
      { op: "capabilities", capabilities: ["seekBackfill"] },
      { op: "datatypes", datatypes },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "player_state", start_time: start, end_time: end, playing: true, speed: 0.2 },
      { op: "seek" },
      { op: "update_time", time: new Time(0, 0) },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
    ]);
  });

  it("backfills previous messages on seek", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const store = new MessageStore(6);
    await source.setListener(store.add);
    source.subscribe({ topic: "/foo/bar" });
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      expect(start).toEqual(new Time(100 - SEEK_BACK_SECONDS, 0));
      expect(end).toEqual(new Time(100, -1));
      expect(topics).toContainOnly(["/foo/bar"]);
      const result: MessageLike[] = [
        {
          topic: "/foo/bar",
          receiveTime: new Time(100, -1),
          message: { payload: "foo bar" },
        },
      ];
      return Promise.resolve(result);
    };
    provider.getMessages = getMessages;
    source.seekPlayback(new Time(100, 0));
    const messages = await store.done;
    expect(messages).toContainOnly([
      { op: "capabilities", capabilities: ["seekBackfill"] },
      { op: "datatypes", datatypes },
      { op: "player_state", start_time: start, end_time: end, playing: false, speed: 0.2 },
      { op: "seek" },
      { op: "update_time", time: new Time(100, 0) },
      {
        op: "message",
        datatype: "fooBar",
        topic: "/foo/bar",
        receiveTime: new Time(100, -1),
        message: { payload: "foo bar" },
      },
    ]);
  });

  it("reads a bunch of messages", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const received = [];
    await source.setListener((msg) => {
      if (msg.op === "message") {
        received.push(msg);
      }
      return Promise.resolve();
    });
    source.subscribe({ topic: "/foo/bar" });
    source.subscribe({ topic: "/baz" });
    const items: MessageLike[] = [
      {
        topic: "/foo/bar",
        receiveTime: new Time(0, 0),
        message: { payload: "foo bar 1" },
      },
      {
        topic: "/baz",
        receiveTime: new Time(0, 500),
        message: { payload: "baz 1" },
      },
      {
        topic: "/baz",
        receiveTime: new Time(0, 5000),
        message: { payload: "baz 2" },
      },
      {
        topic: "/foo/bar",
        receiveTime: new Time(0, 9000000),
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
        receiveTime: new Time(0, 0),
        message: { payload: "foo bar 1" },
      },
      {
        topic: "/baz",
        op: "message",
        datatype: "baz",
        receiveTime: new Time(0, 500),
        message: { payload: "baz 1" },
      },
      {
        topic: "/baz",
        op: "message",
        datatype: "baz",
        receiveTime: new Time(0, 5000),
        message: { payload: "baz 2" },
      },
      {
        topic: "/foo/bar",
        op: "message",
        datatype: "fooBar",
        receiveTime: new Time(0, 9000000),
        message: { payload: "foo bar 2" },
      },
    ]);
  });

  it("calls on abort callback if there is an error in the downstream listener", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const received = [];
    await source.setListener((msg) => {
      if (msg.op === "message") {
        received.push(msg);
        return Promise.reject();
      }
      return Promise.resolve();
    });
    const error = new Error("Something bad happend");
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      return Promise.reject(error);
    };
    provider.getMessages = getMessages;
    source.startPlayback();
    return new Promise((resolve) => {
      source.onAbort((err) => {
        expect(err).toBe(error);
        resolve();
      });
    });
  });

  it("calls on abort callback if there is an error due to bad message being returned", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    const received = [];
    await source.setListener((msg) => {
      if (msg.op === "message") {
        received.push(msg);
        return Promise.reject();
      }
      return Promise.resolve();
    });
    const getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<MessageLike[]> => {
      return Promise.resolve([
        {
          topic: "/missing",
          receiveTime: new Time(0, 0),
          message: "foo",
        },
      ]);
    };
    provider.getMessages = getMessages;
    source.startPlayback();
    return new Promise((resolve) => {
      source.onAbort((err) => {
        expect(err).toBeTruthy();
        resolve();
      });
    });
  });

  it("closes provder when closed", async () => {
    const provider = new TestProvider();
    const source = new RandomAccessDataSource(provider);
    await source.close();
    expect(provider.closed).toBe(true);
  });

  describe("metrics collecting", () => {
    class TestMetricsCollector implements DataSourceMetricsCollectorInterface {
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
      const source = new RandomAccessDataSource(provider, collector);
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
      source.seekPlayback(new Time(0, 500));
      source.seekPlayback(new Time(1, 0));
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
