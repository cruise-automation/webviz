// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { first, flatten, last } from "lodash";
import { TimeUtil } from "rosbag";

import MemoryCacheDataProvider, {
  getBlocksToKeep,
  getPrefetchStartPoint,
  MAX_BLOCK_SIZE_BYTES,
  MAX_BLOCKS,
} from "./MemoryCacheDataProvider";
import delay from "webviz-core/shared/delay";
import { CoreDataProviders } from "webviz-core/src/dataProviders/constants";
import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import type { Bobject, BobjectMessage, Message } from "webviz-core/src/players/types";
import { getObject } from "webviz-core/src/util/binaryObjects";
import naturalSort from "webviz-core/src/util/naturalSort";
import sendNotification from "webviz-core/src/util/sendNotification";

function sortMessages(messages: Message[]) {
  return messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime) || naturalSort()(a.topic, b.topic));
}

const bobjectWithSize = (n: number): Bobject => getObject({}, "time", new ArrayBuffer(n), "");

function generateMessages(): BobjectMessage[] {
  return sortMessages([
    { topic: "/foo", receiveTime: { sec: 100, nsec: 0 }, message: bobjectWithSize(10) },
    { topic: "/foo", receiveTime: { sec: 101, nsec: 0 }, message: bobjectWithSize(10) },
    { topic: "/foo", receiveTime: { sec: 102, nsec: 0 }, message: bobjectWithSize(10) },
    { topic: "/bar", receiveTime: { sec: 100, nsec: 0 }, message: bobjectWithSize(10) },
    { topic: "/bar", receiveTime: { sec: 101, nsec: 0 }, message: bobjectWithSize(10) },
    { topic: "/bar", receiveTime: { sec: 102, nsec: 0 }, message: bobjectWithSize(10) },
  ]);
}

function generateLargeMessages(): BobjectMessage[] {
  // The input is 201 blocks (20.1 seconds) long, with messages every two seconds.
  return sortMessages([
    { topic: "/foo", receiveTime: { sec: 0, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 2, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 4, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 6, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 8, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 10, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 12, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 14, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 16, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 18, nsec: 0 }, message: bobjectWithSize(600) },
    { topic: "/foo", receiveTime: { sec: 20, nsec: 0 }, message: bobjectWithSize(600) },
  ]);
}

function generateMessagesForLongInput(): BobjectMessage[] {
  return sortMessages([
    { topic: "/foo", receiveTime: { sec: 0, nsec: 0 }, message: bobjectWithSize(10) },
    { topic: "/bar", receiveTime: { sec: 3600, nsec: 0 }, message: bobjectWithSize(10) },
  ]);
}

function getProvider(bobjects: BobjectMessage[], unlimitedCache: boolean = false) {
  const messages = { parsedMessages: undefined, bobjects, rosBinaryMessages: undefined };
  const memoryDataProvider = new MemoryDataProvider({ messages, unlimitedCache, providesParsedMessages: false });
  return {
    provider: new MemoryCacheDataProvider(
      { id: "some-id" },
      [{ name: CoreDataProviders.MemoryCacheDataProvider, args: {}, children: [] }],
      () => memoryDataProvider
    ),
    memoryDataProvider,
  };
}

describe("MemoryCacheDataProvider", () => {
  it("initializes", async () => {
    const { provider } = getProvider(generateMessages());
    expect(await provider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
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
    const { provider, memoryDataProvider } = getProvider(generateMessages());
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    memoryDataProvider.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }] });
    expect(mockProgressCallback.mock.calls).toEqual([
      [
        {
          fullyLoadedFractionRanges: [],
          messageCache: {
            startTime: { sec: 100, nsec: 0 },
            blocks: new Array(21),
          },
        },
      ],
    ]);
  });

  it("reads ahead data when some topics are given", async () => {
    const { provider, memoryDataProvider } = getProvider(generateMessages());
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
    jest.spyOn(memoryDataProvider, "getMessages");

    await provider.initialize(extensionPoint);
    await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 100, nsec: 0 }, { bobjects: ["/foo"] });
    await delay(10);
    expect(last(mockProgressCallback.mock.calls)).toEqual([
      {
        fullyLoadedFractionRanges: [{ start: 0, end: 1 }],
        messageCache: {
          startTime: { sec: 100, nsec: 0 },
          blocks: expect.arrayContaining([]),
        },
      },
    ]);
    expect(last(memoryDataProvider.getMessages.mock.calls)).toEqual([
      // The last block will typically be exactly one timestamp since BLOCK_SIZE_NS divides seconds.
      { sec: 102, nsec: 0 },
      { sec: 102, nsec: 0 },
      // Has the right topic:
      { bobjects: ["/foo"] },
    ]);
  });

  it("limits the number of blocks made for very long bags", async () => {
    const { provider, memoryDataProvider } = getProvider(generateMessagesForLongInput());
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
    jest.spyOn(memoryDataProvider, "getMessages");

    await provider.initialize(extensionPoint);
    await provider.getMessages({ sec: 0, nsec: 0 }, { sec: 0, nsec: 1 }, { bobjects: ["/foo"] });
    await delay(100);
    expect(last(mockProgressCallback.mock.calls)).toEqual([
      expect.objectContaining({ fullyLoadedFractionRanges: [{ start: 0, end: 1 }] }),
    ]);
    expect(memoryDataProvider.getMessages.mock.calls).toHaveLength(MAX_BLOCKS);
    // Start of the first call is the start of the bag
    expect(memoryDataProvider.getMessages.mock.calls[0][0]).toEqual({ sec: 0, nsec: 0 });
    // End of the last call is the end of the bag
    expect(last(memoryDataProvider.getMessages.mock.calls)[1]).toEqual({ sec: 3600, nsec: 0 });
  });

  it("prefetches earlier data when there is enough space", async () => {
    const { provider, memoryDataProvider } = getProvider(generateMessages());
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
    jest.spyOn(memoryDataProvider, "getMessages");

    await provider.initialize(extensionPoint);
    await provider.getMessages({ sec: 101, nsec: 0 }, { sec: 101, nsec: 0 }, { bobjects: ["/foo"] });
    await delay(10);
    expect(last(mockProgressCallback.mock.calls)).toEqual([
      {
        fullyLoadedFractionRanges: [{ start: 0, end: 1 }],
        messageCache: {
          startTime: { sec: 100, nsec: 0 },
          blocks: expect.arrayContaining([]),
        },
      },
    ]);
    // The first request is at/after the requested range.
    expect(first(memoryDataProvider.getMessages.mock.calls)).toEqual([
      { sec: 101, nsec: 0 },
      { sec: 101, nsec: 0.1e9 - 1 },
      { bobjects: ["/foo"] },
    ]);
    // The last request is up to the requested range from below.
    expect(last(memoryDataProvider.getMessages.mock.calls)).toEqual([
      { sec: 100, nsec: 0.9e9 },
      { sec: 100, nsec: 1e9 - 1 },
      { bobjects: ["/foo"] },
    ]);
  });

  it("stops prefetching once it hits the memory budget", async () => {
    const { provider } = getProvider(generateLargeMessages());
    // Fit four 600 byte messages into our memory budget. (getBlocksToKeep leaves the cache over-full
    // and will evict blocks until five messages are present.)
    provider.setCacheSizeBytesInTests(2500);
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    await provider.getMessages({ sec: 0, nsec: 0 }, { sec: 0, nsec: 0 }, { bobjects: ["/foo"] });
    await delay(10);
    // The input is 20.1 seconds long, or 201 blocks.
    // We read the five messages at 0s, 2s, 4s, 6s and 8s, holding the blocks from 0s to 8.1s.
    expect(last(mockProgressCallback.mock.calls)).toEqual([
      {
        fullyLoadedFractionRanges: [{ start: 0, end: 81 / 201 }],
        messageCache: {
          startTime: { sec: 0, nsec: 0 },
          blocks: expect.arrayContaining([]),
        },
      },
    ]);
  });

  it("does not stop prefetching with unlimitedCache", async () => {
    const { provider } = getProvider(generateLargeMessages(), true);
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    await provider.getMessages({ sec: 0, nsec: 0 }, { sec: 0, nsec: 0 }, { bobjects: ["/foo"] });
    await delay(10);
    expect(last(mockProgressCallback.mock.calls)).toEqual([
      {
        fullyLoadedFractionRanges: [{ start: 0, end: 1 }],
        messageCache: {
          startTime: { sec: 0, nsec: 0 },
          blocks: expect.arrayContaining([]),
        },
      },
    ]);
  });

  it("prefetches after the last request", async () => {
    const { provider } = getProvider(generateLargeMessages());
    // Fit four 600 byte messages into our memory budget. (getBlocksToKeep leaves the cache over-full
    // and will evict blocks until five messages are present.)
    provider.setCacheSizeBytesInTests(2500);
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    await provider.getMessages({ sec: 0, nsec: 0 }, { sec: 0, nsec: 1e9 - 1 }, { bobjects: ["/foo"] });
    await provider.getMessages({ sec: 10, nsec: 0 }, { sec: 10, nsec: 0 }, { bobjects: ["/foo"] });
    await delay(10);
    // The input is 20.1 seconds long, or 201 blocks.
    // The initial read request loads from 0s to 1s, containing one message at 0s.
    // The second read prefetches the four messages at 10s, 12s, 14s and 16s, holding the blocks
    // from 10s to 16.1s.
    expect(last(mockProgressCallback.mock.calls)).toEqual([
      {
        fullyLoadedFractionRanges: [{ start: 0, end: 10 / 201 }, { start: 100 / 201, end: 161 / 201 }],
        messageCache: {
          startTime: { sec: 0, nsec: 0 },
          blocks: expect.arrayContaining([]),
        },
      },
    ]);
  });

  it("returns messages", async () => {
    const inputMessages = generateMessages();
    const { provider } = getProvider(inputMessages);
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
    expect(messages).toEqual(inputMessages);
  });

  it("shows an error when having a block that is very large", async () => {
    const { provider } = getProvider([
      { topic: "/foo", receiveTime: { sec: 100, nsec: 0 }, message: bobjectWithSize(MAX_BLOCK_SIZE_BYTES + 10) },
    ]);
    await provider.initialize(mockExtensionPoint().extensionPoint);
    provider.getMessages({ sec: 100, nsec: 0 }, { sec: 102, nsec: 0 }, { bobjects: ["/foo"] });
    await delay(10);
    sendNotification.expectCalledDuringTest();
  });

  // TODO(JP): We test getBlocksToKeep separately, but never as part of MemoryCacheDataProvider.
  // This is a bit more work to set up properly, so I haven't done that for now since I feel like
  // the units themselves are sufficiently tested, but in the future it would be good to add some
  // more coverage, especially as this code matures.
  describe("getBlocksToKeep", () => {
    it("keeps all blocks if we haven't reached the maximum cache size yet", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 2, undefined, undefined, undefined],
          maxCacheSizeInBytes: 5,
          badEvictionRange: undefined,
        })
      ).toEqual({ blockIndexesToKeep: new Set([1, 0]), newRecentRanges: [{ start: 0, end: 5 }] });
    });

    it("keeps all blocks if we haven't reached the maximum cache size yet, even when having some empty blocks", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 0, 2, undefined, undefined],
          maxCacheSizeInBytes: 5,
          badEvictionRange: undefined,
        })
      ).toEqual({ blockIndexesToKeep: new Set([2, 1, 0]), newRecentRanges: [{ start: 0, end: 5 }] });
    });

    it("keeps blocks when we *just* exceed the maximum", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 2, 3, undefined, undefined],
          maxCacheSizeInBytes: 5,
          badEvictionRange: undefined,
        })
      ).toEqual({ blockIndexesToKeep: new Set([2, 1, 0]), newRecentRanges: [{ start: 0, end: 5 }] });
    });

    it("removes blocks when exceeding the maximum (and updates newRecentRanges)", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 2, 3, 4, undefined],
          maxCacheSizeInBytes: 5,
          badEvictionRange: undefined,
        })
      ).toEqual({ blockIndexesToKeep: new Set([3, 2]), newRecentRanges: [{ start: 2, end: 5 }] });
    });

    it("removes blocks from the left when the playback cursor is on the right", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 1, 1, 1, 1],
          maxCacheSizeInBytes: 2,
          badEvictionRange: { start: 4, end: 5 },
        })
      ).toEqual({ blockIndexesToKeep: new Set([2, 3, 4]), newRecentRanges: [{ start: 2, end: 5 }] });
    });

    it("removes blocks from the right when the playback cursor is on the left", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 1, 1, 1, 1],
          maxCacheSizeInBytes: 2,
          badEvictionRange: { start: 0, end: 1 },
        })
      ).toEqual({ blockIndexesToKeep: new Set([0, 1, 2]), newRecentRanges: [{ start: 0, end: 3 }] });
    });

    it("keeps everything in the bad eviction range", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 1, 1, 1, 1, 1], // six elements
          maxCacheSizeInBytes: 3,
          badEvictionRange: { start: 2, end: 6 },
        })
      ).toEqual({
        // Note: This isn't super -- we evict from the end furthest from the start of the bad
        // eviction range, which is the end. It would be better to evict from the end furthest from
        // _any part_ of the eviction range, but it's more complicated and this is an uncommon case.
        // The eviction range is typically small relative to the loaded ranges.
        blockIndexesToKeep: new Set([0, 2, 3, 4, 5]),
        newRecentRanges: [{ start: 2, end: 6 }, { start: 0, end: 1 }],
      });
    });
  });

  describe("getPrefetchStartPoint", () => {
    it("fetches from the first range after the cursor if there is one", () => {
      expect(getPrefetchStartPoint([{ start: 0, end: 2 }, { start: 4, end: 6 }, { start: 8, end: 10 }], 3)).toEqual(4);
    });

    it("fetches from the first range on the left if there are none on the right", () => {
      expect(getPrefetchStartPoint([{ start: 0, end: 2 }, { start: 4, end: 6 }], 7)).toEqual(0);
    });
  });
});
