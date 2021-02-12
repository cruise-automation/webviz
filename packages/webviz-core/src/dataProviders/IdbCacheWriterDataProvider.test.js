// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten } from "lodash";
import { TimeUtil } from "rosbag";

import { getIdbCacheDataProviderDatabase, MESSAGES_STORE_NAME, TIMESTAMP_INDEX } from "./IdbCacheDataProviderDatabase";
import IdbCacheWriterDataProvider, { BLOCK_SIZE_NS } from "./IdbCacheWriterDataProvider";
import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import type { Message, TypedMessage } from "webviz-core/src/players/types";
import { getDatabasesInTests } from "webviz-core/src/util/indexeddb/getDatabasesInTests";
import naturalSort from "webviz-core/src/util/naturalSort";

function sortMessages(messages: Message[]) {
  return messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime) || naturalSort()(a.topic, b.topic));
}

function generateMessages(topics: string[]): TypedMessage<ArrayBuffer>[] {
  return sortMessages(
    flatten(
      topics.map((topic) => [
        { topic, receiveTime: { sec: 100, nsec: 0 }, message: new ArrayBuffer(0) },
        { topic, receiveTime: { sec: 101, nsec: 0 }, message: new ArrayBuffer(1) },
        { topic, receiveTime: { sec: 102, nsec: 0 }, message: new ArrayBuffer(2) },
      ])
    )
  );
}

function getProvider() {
  const memoryDataProvider = new MemoryDataProvider({
    messages: {
      rosBinaryMessages: generateMessages(["/foo", "/bar", "/baz"]),
      parsedMessages: undefined,
      bobjects: undefined,
    },
  });
  const provider = new IdbCacheWriterDataProvider(
    { id: "some-id" },
    [{ name: "MemoryDataProvider", args: {}, children: [] }],
    () => memoryDataProvider
  );
  return { provider, memoryDataProvider };
}

describe("IdbCacheWriterDataProvider", () => {
  afterEach(() => {
    getDatabasesInTests().clear();
  });

  it("initializes", async () => {
    const { provider } = getProvider();
    const { extensionPoint } = mockExtensionPoint();
    expect(await provider.initialize(extensionPoint)).toEqual({
      start: { nsec: 0, sec: 100 },
      end: { nsec: 0, sec: 102 },
      topics: [],
      messageDefinitions: {
        type: "raw",
        messageDefinitionsByTopic: {},
      },
      providesParsedMessages: false,
    });
  });

  it("suppresses the underlying progress updates, and only publishes its own", async () => {
    const { provider, memoryDataProvider } = getProvider();
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    memoryDataProvider.extensionPoint.progressCallback({});
    expect(mockProgressCallback.mock.calls).toEqual([
      [{ fullyLoadedFractionRanges: [], nsTimeRangesSinceBagStart: {} }],
    ]);
  });

  it("loads when calling getMessages", async () => {
    const { provider } = getProvider();
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    const emptyArray = await provider.getMessages(
      { sec: 100, nsec: 0 },
      { sec: 102, nsec: 0 },
      { rosBinaryMessages: ["/foo"] }
    );

    // See comment in previous test for why we make this many calls.
    expect(mockProgressCallback.mock.calls.length).toEqual(4 + 4e9 / BLOCK_SIZE_NS);
    expect(emptyArray).toEqual({ bobjects: undefined, parsedMessages: undefined, rosBinaryMessages: [] });

    const db = await getIdbCacheDataProviderDatabase("some-id");
    const messages = await db.getRange(MESSAGES_STORE_NAME, TIMESTAMP_INDEX, 0, 2e9);
    expect(messages.map(({ value }) => value.message)).toEqual(generateMessages(["/foo"]));
  });

  it("doesn't load the same messages twice", async () => {
    const { provider } = getProvider();

    await provider.initialize(mockExtensionPoint().extensionPoint);
    await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 102, nsec: 0 }, { rosBinaryMessages: ["/foo"] });
    await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 102, nsec: 0 }, { rosBinaryMessages: ["/foo", "/bar"] });
    await provider.getMessages(
      { sec: 101, nsec: 0 },
      { sec: 102, nsec: 0 },
      { rosBinaryMessages: ["/foo", "/bar", "/baz"] }
    );
    await provider.getMessages(
      { sec: 100, nsec: 0 },
      { sec: 102, nsec: 0 },
      { rosBinaryMessages: ["/foo", "/bar", "/baz"] }
    );

    const db = await getIdbCacheDataProviderDatabase("some-id");
    const messages = await db.getRange(MESSAGES_STORE_NAME, TIMESTAMP_INDEX, 0, 2e9);
    expect(sortMessages(messages.map(({ value }) => value.message))).toEqual(
      generateMessages(["/foo", "/bar", "/baz"])
    );
  });

  // When this happens, we still have a promise to resolve, and we can't keep it unresolved because
  // then the part of the application that is waiting for that promise might lock up, and we cannot
  // resolve it with the newer topics because that would violate the API.
  it("still loads old topics when there is a getMessages call pending while getMessages gets called", async () => {
    const { provider } = getProvider();
    const { extensionPoint } = mockExtensionPoint();
    jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    const getMessagesPromise1 = provider.getMessages(
      { sec: 100, nsec: 0 },
      { sec: 102, nsec: 0 },
      { rosBinaryMessages: ["/foo"] }
    );
    const getMessagesPromise2 = provider.getMessages(
      { sec: 100, nsec: 0 },
      { sec: 102, nsec: 0 },
      { rosBinaryMessages: ["/foo", "/bar"] }
    );

    expect(await getMessagesPromise1).toEqual({
      bobjects: undefined,
      parsedMessages: undefined,
      rosBinaryMessages: [],
    });
    expect(await getMessagesPromise2).toEqual({
      bobjects: undefined,
      parsedMessages: undefined,
      rosBinaryMessages: [],
    });

    const db = await getIdbCacheDataProviderDatabase("some-id");
    const messages = await db.getRange(MESSAGES_STORE_NAME, TIMESTAMP_INDEX, 0, 6e9);
    expect(sortMessages(messages.map(({ value }) => value.message))).toEqual(generateMessages(["/foo", "/bar"]));
  });
});
