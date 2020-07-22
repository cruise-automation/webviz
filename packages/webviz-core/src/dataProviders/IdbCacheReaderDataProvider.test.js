// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import IdbCacheReaderDataProvider from "./IdbCacheReaderDataProvider";
import IdbCacheWriterDataProvider from "./IdbCacheWriterDataProvider";
import { CoreDataProviders } from "webviz-core/src/dataProviders/constants";
import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import type { Message } from "webviz-core/src/players/types";
import { getDatabasesInTests } from "webviz-core/src/util/indexeddb/getDatabasesInTests";

function generateMessages(): Message[] {
  return [
    { topic: "/foo", receiveTime: { sec: 100, nsec: 0 }, message: 0 },
    { topic: "/foo", receiveTime: { sec: 101, nsec: 0 }, message: 1 },
    { topic: "/foo", receiveTime: { sec: 102, nsec: 0 }, message: 2 },
  ];
}

function getProvider() {
  return new IdbCacheReaderDataProvider(
    { id: "some-id" },
    [{ name: CoreDataProviders.IdbCacheWriterDataProvider, args: {}, children: [] }],
    () =>
      new IdbCacheWriterDataProvider(
        { id: "some-id" },
        [{ name: CoreDataProviders.MemoryCacheDataProvider, args: {}, children: [] }],
        () => new MemoryDataProvider({ messages: generateMessages(), providesParsedMessages: true })
      )
  );
}

describe("IdbCacheReaderDataProvider", () => {
  afterEach(() => {
    getDatabasesInTests().clear();
  });

  it("initializes", async () => {
    const provider = getProvider();
    expect(await provider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
      start: { nsec: 0, sec: 100 },
      end: { nsec: 0, sec: 102 },
      topics: [],
      datatypes: {},
      messageDefinitionsByTopic: {},
      providesParsedMessages: true,
    });
  });

  it("returns messages", async () => {
    const provider = getProvider();
    await provider.initialize(mockExtensionPoint().extensionPoint);
    const messages = await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 102, nsec: 0 }, ["/foo"]);
    expect(messages).toEqual(generateMessages());
  });
});
