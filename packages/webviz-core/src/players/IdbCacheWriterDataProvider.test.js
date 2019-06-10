// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten } from "lodash";
import { TimeUtil } from "rosbag";

import { getIdbCacheDataProviderDatabase, MESSAGES_STORE_NAME, TIMESTAMP_INDEX } from "./IdbCacheDataProviderDatabase";
import IdbCacheWriterDataProvider, { BLOCK_SIZE_NS } from "./IdbCacheWriterDataProvider";
import delay from "webviz-core/shared/delay";
import MemoryDataProvider from "webviz-core/src/players/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/players/mockExtensionPoint";
import type { MessageLike } from "webviz-core/src/players/types";
import { getDatabasesInTests } from "webviz-core/src/util/indexeddb/getDatabasesInTests";
import naturalSort from "webviz-core/src/util/naturalSort";

function sortMessages(messages: MessageLike[]) {
  return messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime) || naturalSort()(a.topic, b.topic));
}

function generateMessages(topics: string[]): MessageLike[] {
  return sortMessages(
    flatten(
      topics.map((topic) => [
        { topic, receiveTime: { sec: 100, nsec: 0 }, message: 0 },
        { topic, receiveTime: { sec: 101, nsec: 0 }, message: 1 },
        { topic, receiveTime: { sec: 102, nsec: 0 }, message: 2 },
      ])
    )
  );
}

function getProvider() {
  const memoryDataProvider = new MemoryDataProvider({ messages: generateMessages(["/foo", "/bar", "/baz"]) });
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
      datatypes: {},
    });
  });

  it("suppresses the underlying progress updates, and only publishes its own", async () => {
    const { provider, memoryDataProvider } = getProvider();
    const { extensionPoint } = mockExtensionPoint();
    jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    memoryDataProvider.extensionPoint.progressCallback({});
    expect(extensionPoint.progressCallback.mock.calls).toEqual([
      [{ fullyLoadedFractionRanges: [], nsTimeRangesSinceBagStart: {} }],
    ]);
  });

  it("loads when topics are selected", async () => {
    const { provider } = getProvider();
    const { extensionPoint, topicCallbacks } = mockExtensionPoint();
    jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    topicCallbacks[0](["/foo"]);
    await delay(1000); // Wait until fully loaded and written to local db.

    expect(extensionPoint.progressCallback.mock.calls.length).toEqual(3 + 2e9 / BLOCK_SIZE_NS);

    const db = await getIdbCacheDataProviderDatabase("some-id");
    const messages = await db.getRange(MESSAGES_STORE_NAME, TIMESTAMP_INDEX, 0, 2e9);
    expect(messages.map(({ value }) => value.message)).toEqual(generateMessages(["/foo"]));
  });

  it("loads when calling getMessages", async () => {
    const { provider } = getProvider();
    const { extensionPoint } = mockExtensionPoint();
    jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    const emptyArray = await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 102, nsec: 0 }, ["/foo"]);

    expect(extensionPoint.progressCallback.mock.calls.length).toEqual(3 + 2e9 / BLOCK_SIZE_NS);
    expect(emptyArray).toEqual([]);

    const db = await getIdbCacheDataProviderDatabase("some-id");
    const messages = await db.getRange(MESSAGES_STORE_NAME, TIMESTAMP_INDEX, 0, 2e9);
    expect(messages.map(({ value }) => value.message)).toEqual(generateMessages(["/foo"]));
  });

  it("doesn't load the same messages twice", async () => {
    const { provider } = getProvider();

    await provider.initialize(mockExtensionPoint().extensionPoint);
    await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 102, nsec: 0 }, ["/foo"]);
    await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 102, nsec: 0 }, ["/foo", "/bar"]);
    await provider.getMessages({ sec: 101, nsec: 0 }, { sec: 102, nsec: 0 }, ["/foo", "/bar", "/baz"]);
    await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 102, nsec: 0 }, ["/foo", "/bar", "/baz"]);

    const db = await getIdbCacheDataProviderDatabase("some-id");
    const messages = await db.getRange(MESSAGES_STORE_NAME, TIMESTAMP_INDEX, 0, 2e9);
    expect(sortMessages(messages.map(({ value }) => value.message))).toEqual(
      generateMessages(["/foo", "/bar", "/baz"])
    );
  });
});
