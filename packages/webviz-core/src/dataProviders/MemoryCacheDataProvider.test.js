// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten, last } from "lodash";
import { TimeUtil } from "rosbag";

import MemoryCacheDataProvider, { getBlocksToKeep } from "./MemoryCacheDataProvider";
import delay from "webviz-core/shared/delay";
import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import type { DataProviderMessage } from "webviz-core/src/dataProviders/types";
import naturalSort from "webviz-core/src/util/naturalSort";
import reportError from "webviz-core/src/util/reportError";

function sortMessages(messages: DataProviderMessage[]) {
  return messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime) || naturalSort()(a.topic, b.topic));
}

function generateMessages(): DataProviderMessage[] {
  return sortMessages([
    { topic: "/foo", receiveTime: { sec: 100, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/foo", receiveTime: { sec: 101, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/foo", receiveTime: { sec: 102, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/bar", receiveTime: { sec: 100, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/bar", receiveTime: { sec: 101, nsec: 0 }, message: new ArrayBuffer(10) },
    { topic: "/bar", receiveTime: { sec: 102, nsec: 0 }, message: new ArrayBuffer(10) },
  ]);
}

function getProvider(messages: DataProviderMessage[]) {
  const memoryDataProvider = new MemoryDataProvider({ messages });
  return {
    provider: new MemoryCacheDataProvider(
      { id: "some-id" },
      [{ name: "IdbCacheWriterDataProvider", args: {}, children: [] }],
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
      datatypes: {},
    });
  });

  it("suppresses the underlying progress updates, and only publishes its own", async () => {
    const { provider, memoryDataProvider } = getProvider(generateMessages());
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");

    await provider.initialize(extensionPoint);
    memoryDataProvider.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }] });
    expect(mockProgressCallback.mock.calls).toEqual([[{ fullyLoadedFractionRanges: [] }]]);
  });

  it("reads ahead data when some topics are given", async () => {
    const { provider, memoryDataProvider } = getProvider(generateMessages());
    const { extensionPoint } = mockExtensionPoint();
    const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
    jest.spyOn(memoryDataProvider, "getMessages");

    await provider.initialize(extensionPoint);
    await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 100, nsec: 0 }, ["/foo"]);
    await delay(10);
    expect(last(mockProgressCallback.mock.calls)).toEqual([{ fullyLoadedFractionRanges: [{ start: 0, end: 1 }] }]);
    expect(last(memoryDataProvider.getMessages.mock.calls)).toEqual([
      // The last block will typically be exactly one timestamp since BLOCK_SIZE_NS divides seconds.
      { sec: 102, nsec: 0 },
      { sec: 102, nsec: 0 },
      // Has the right topic:
      ["/foo"],
    ]);
  });

  it("returns messages", async () => {
    const { provider } = getProvider(generateMessages());
    await provider.initialize(mockExtensionPoint().extensionPoint);
    // Make a bunch of different calls in quick succession and out of order, and stitch them
    // together, to test a bit more thoroughly.
    const messages = sortMessages(
      flatten(
        await Promise.all([
          provider.getMessages({ sec: 102, nsec: 0 }, { sec: 102, nsec: 0 }, ["/foo"]),
          provider.getMessages({ sec: 100, nsec: 0 }, { sec: 100, nsec: 0 }, ["/foo", "/bar"]),
          provider.getMessages({ sec: 100, nsec: 1 }, { sec: 101, nsec: 1e9 - 1 }, ["/foo"]),
          provider.getMessages({ sec: 100, nsec: 1 }, { sec: 101, nsec: 1e9 - 1 }, ["/bar"]),
          provider.getMessages({ sec: 102, nsec: 0 }, { sec: 102, nsec: 0 }, ["/bar"]),
        ])
      )
    );
    expect(messages).toEqual(generateMessages());
  });

  it("does not allow storing non-ArrayBuffer messages", async () => {
    const { provider } = getProvider([{ topic: "/foo", receiveTime: { sec: 100, nsec: 0 }, message: 0 }]);
    await provider.initialize(mockExtensionPoint().extensionPoint);
    provider.getMessages({ sec: 100, nsec: 0 }, { sec: 102, nsec: 0 }, ["/foo"]);
    await delay(10);
    reportError.expectCalledDuringTest();
  });

  // TODO(JP): We test getBlocksToKeep separately, but never as part of MemoryCacheDataProvider.
  // This is a bit more work to set up properly, so I haven't done that for now since I feel like
  // the units themselves are sufficiently tested, but in the future it would be good to add some
  // more coverage, especially as this code matures.
  describe("getBlocksToKeep", () => {
    it("keeps all blocks if we haven't reached the minimum yet", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 2, undefined, undefined, undefined],
          minimumBlocksToKeep: 3,
          maxCacheSizeInBytes: 5,
        })
      ).toEqual({ blockIndexesToKeep: new Set([1, 0]), newRecentRanges: [{ start: 0, end: 5 }] });
    });

    it("keeps all blocks if we haven't reached the maximum cache size yet", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 2, undefined, undefined, undefined],
          minimumBlocksToKeep: 0,
          maxCacheSizeInBytes: 5,
        })
      ).toEqual({ blockIndexesToKeep: new Set([1, 0]), newRecentRanges: [{ start: 0, end: 5 }] });
    });

    it("keeps all blocks if we haven't reached the maximum cache size yet, even when having some empty blocks", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 0, 2, undefined, undefined],
          minimumBlocksToKeep: 0,
          maxCacheSizeInBytes: 5,
        })
      ).toEqual({ blockIndexesToKeep: new Set([2, 1, 0]), newRecentRanges: [{ start: 0, end: 5 }] });
    });

    it("keeps blocks when we *just* exceed the maximum", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 2, 3, undefined, undefined],
          minimumBlocksToKeep: 0,
          maxCacheSizeInBytes: 5,
        })
      ).toEqual({ blockIndexesToKeep: new Set([2, 1, 0]), newRecentRanges: [{ start: 0, end: 5 }] });
    });

    it("removes blocks when exceeding the maximum (and updates newRecentRanges)", () => {
      expect(
        getBlocksToKeep({
          recentBlockRanges: [{ start: 0, end: 5 }],
          blockSizesInBytes: [1, 2, 3, 4, undefined],
          minimumBlocksToKeep: 0,
          maxCacheSizeInBytes: 5,
        })
      ).toEqual({ blockIndexesToKeep: new Set([3, 2]), newRecentRanges: [{ start: 2, end: 5 }] });
    });
  });
});
