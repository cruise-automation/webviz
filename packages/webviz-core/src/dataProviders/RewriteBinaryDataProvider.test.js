// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten } from "lodash";
import { TimeUtil } from "rosbag";

import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import RewriteBinaryDataProvider from "webviz-core/src/dataProviders/RewriteBinaryDataProvider";
import type { Message, TypedMessage } from "webviz-core/src/players/types";
import naturalSort from "webviz-core/src/util/naturalSort";

function sortMessages(messages: Message[]) {
  return messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime) || naturalSort()(a.topic, b.topic));
}

function generateMessages(): TypedMessage<ArrayBuffer>[] {
  return sortMessages([
    { topic: "/foo", receiveTime: { sec: 100, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/foo", receiveTime: { sec: 101, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/foo", receiveTime: { sec: 102, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/bar", receiveTime: { sec: 100, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/bar", receiveTime: { sec: 101, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/bar", receiveTime: { sec: 102, nsec: 0 }, message: new ArrayBuffer(10) },
  ]);
}

function getProvider(
  rosBinaryMessages: TypedMessage<ArrayBuffer>[],
  useBinaryObjects: boolean,
  unlimitedCache: boolean = false
) {
  const messages = { parsedMessages: undefined, rosBinaryMessages, bobjects: undefined };
  const memoryDataProvider = new MemoryDataProvider({
    messages,
    unlimitedCache,
    providesParsedMessages: false,
    datatypes: {},
  });
  return {
    provider: new RewriteBinaryDataProvider(
      { useBinaryObjects },
      [{ name: "MemoryDataProvider", args: {}, children: [] }],
      () => memoryDataProvider
    ),
    memoryDataProvider,
  };
}

describe("RewriteBinaryDataProvider", () => {
  it("initializes", async () => {
    const { provider } = getProvider(generateMessages(), true);
    expect(await provider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
      start: { nsec: 0, sec: 100 },
      end: { nsec: 0, sec: 102 },
      topics: [],
      messageDefinitions: {
        type: "parsed",
        datatypes: {},
        messageDefinitionsByTopic: {},
        parsedMessageDefinitionsByTopic: {},
      },
      providesParsedMessages: false,
    });
  });

  it("returns Ros binary messages if disabled", async () => {
    const { provider } = getProvider(generateMessages(), false);
    await provider.initialize(mockExtensionPoint().extensionPoint);
    // Make a bunch of different calls in quick succession and out of order, and stitch them
    // together, to test a bit more thoroughly.
    const results = await Promise.all([
      provider.getMessages({ sec: 102, nsec: 0 }, { sec: 102, nsec: 0 }, { bobjects: ["/foo"] }),
      provider.getMessages({ sec: 100, nsec: 0 }, { sec: 100, nsec: 0 }, { bobjects: ["/foo", "/bar"] }),
      provider.getMessages({ sec: 100, nsec: 1 }, { sec: 101, nsec: 1e9 - 1 }, { bobjects: ["/foo"] }),
      provider.getMessages({ sec: 100, nsec: 1 }, { sec: 101, nsec: 1e9 - 1 }, { bobjects: ["/bar"] }),
      provider.getMessages({ sec: 102, nsec: 0 }, { sec: 102, nsec: 0 }, { bobjects: ["/bar"] }),
    ]);
    const messages = sortMessages(flatten(results.map(({ bobjects }) => bobjects || [])));
    expect(messages).toEqual(generateMessages());
  });

  it("returns bobjects messages if enabled", async () => {
    const { provider } = getProvider(generateMessages(), false);
    await provider.initialize(mockExtensionPoint().extensionPoint);
    // Make a bunch of different calls in quick succession and out of order, and stitch them
    // together, to test a bit more thoroughly.
    const results = await Promise.all([
      provider.getMessages({ sec: 102, nsec: 0 }, { sec: 102, nsec: 0 }, { bobjects: ["/foo"] }),
      provider.getMessages({ sec: 100, nsec: 0 }, { sec: 100, nsec: 0 }, { bobjects: ["/foo", "/bar"] }),
      provider.getMessages({ sec: 100, nsec: 1 }, { sec: 101, nsec: 1e9 - 1 }, { bobjects: ["/foo"] }),
      provider.getMessages({ sec: 100, nsec: 1 }, { sec: 101, nsec: 1e9 - 1 }, { bobjects: ["/bar"] }),
      provider.getMessages({ sec: 102, nsec: 0 }, { sec: 102, nsec: 0 }, { bobjects: ["/bar"] }),
    ]);
    const messages = sortMessages(flatten(results.map(({ bobjects }) => bobjects || [])));
    expect(messages).toEqual(generateMessages());
  });
});
