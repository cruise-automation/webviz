// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

import ReadAheadDataProvider, { ReadResult } from "./ReadAheadDataProvider";
import { fromMillis } from "webviz-core/src/util/time";

function generateMessages() {
  const result = [];
  const start = new Time(0, 0);
  for (let i = 0; i < 100; i++) {
    const millis = i * 10;
    const message = {
      receiveTime: Time.add(start, fromMillis(millis)),
      message: `message: ${i}`,
    };
    result.push({
      ...message,
      topic: "/foo",
    });
    result.push({
      ...message,
      topic: "/bar",
    });
  }
  return result;
}

class InMemorydataProvider {
  messages: any;
  constructor() {
    this.messages = generateMessages();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  initialize(): any {
    return (Promise.resolve(): any);
  }

  async getMessages(start: Time, end: Time, topics: string[]) {
    const result = [];
    for (const message of this.messages) {
      if (Time.isGreaterThan(message.receiveTime, end)) {
        break;
      }
      if (Time.isLessThan(message.receiveTime, start)) {
        continue;
      }
      if (!topics.includes(message.topic)) {
        continue;
      }
      result.push(message);
    }
    return result;
  }
}

describe("ReadResult", () => {
  it("properly response to ranges it contains", () => {
    const result = new ReadResult(new Time(0, 2), new Time(1, 0), Promise.resolve([]));
    expect(result.contains(new Time(0, 0), new Time(0, 1))).toBe(false);
    expect(result.contains(new Time(0, 0), new Time(0, 2))).toBe(true);
    expect(result.contains(new Time(0, 0), new Time(2, 0))).toBe(true);
    expect(result.contains(new Time(0, 10), new Time(0, 11))).toBe(true);
    expect(result.contains(new Time(1, 0), new Time(2, 0))).toBe(true);
    expect(result.contains(new Time(1, 1), new Time(2, 0))).toBe(false);
  });
});

describe("Message Cachce", () => {
  it("can get messages", async () => {
    const provider = new ReadAheadDataProvider(new InMemorydataProvider());
    const messages = await provider.getMessages(fromMillis(0), fromMillis(10), ["/foo"]);
    expect(messages).toEqual([
      {
        receiveTime: fromMillis(0),
        topic: "/foo",
        message: "message: 0",
      },
      {
        receiveTime: fromMillis(10),
        topic: "/foo",
        message: "message: 1",
      },
    ]);
  });

  it("can get messages spanning two read ranges", async () => {
    const provider = new ReadAheadDataProvider(new InMemorydataProvider(), fromMillis(10));
    const messages = await provider.getMessages(fromMillis(0), fromMillis(20), ["/foo"]);
    expect(messages).toEqual([
      {
        receiveTime: fromMillis(0),
        topic: "/foo",
        message: "message: 0",
      },
      {
        receiveTime: fromMillis(10),
        topic: "/foo",
        message: "message: 1",
      },
      {
        receiveTime: fromMillis(20),
        topic: "/foo",
        message: "message: 2",
      },
    ]);
  });

  it("can get messages spanning many read ranges", async () => {
    const provider = new ReadAheadDataProvider(new InMemorydataProvider(), fromMillis(10));
    const messages = await provider.getMessages(fromMillis(0), fromMillis(40), ["/foo"]);
    expect(messages).toEqual([
      {
        receiveTime: fromMillis(0),
        topic: "/foo",
        message: "message: 0",
      },
      {
        receiveTime: fromMillis(10),
        topic: "/foo",
        message: "message: 1",
      },
      {
        receiveTime: fromMillis(20),
        topic: "/foo",
        message: "message: 2",
      },
      {
        receiveTime: fromMillis(30),
        topic: "/foo",
        message: "message: 3",
      },
      {
        receiveTime: fromMillis(40),
        topic: "/foo",
        message: "message: 4",
      },
    ]);
  });

  it("clears cache on topic change", async () => {
    const provider = new ReadAheadDataProvider(new InMemorydataProvider(), fromMillis(10));
    const messages = await provider.getMessages(fromMillis(0), fromMillis(10), ["/foo"]);
    expect(messages).toEqual([
      {
        receiveTime: fromMillis(0),
        topic: "/foo",
        message: "message: 0",
      },
      {
        receiveTime: fromMillis(10),
        topic: "/foo",
        message: "message: 1",
      },
    ]);
    const messages2 = await provider.getMessages(fromMillis(0), fromMillis(10), ["/foo", "/bar"]);
    expect(messages2).toEqual([
      {
        receiveTime: fromMillis(0),
        topic: "/foo",
        message: "message: 0",
      },
      {
        receiveTime: fromMillis(0),
        topic: "/bar",
        message: "message: 0",
      },
      {
        receiveTime: fromMillis(10),
        topic: "/foo",
        message: "message: 1",
      },
      {
        receiveTime: fromMillis(10),
        topic: "/bar",
        message: "message: 1",
      },
    ]);
  });
});
