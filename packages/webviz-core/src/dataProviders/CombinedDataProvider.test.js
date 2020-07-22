// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CombinedDataProvider, { mergedBlocks } from "webviz-core/src/dataProviders/CombinedDataProvider";
import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import RenameDataProvider from "webviz-core/src/dataProviders/RenameDataProvider";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import { fromMillis } from "webviz-core/src/util/time";

// reusable providers
function provider1(initiallyLoaded = false) {
  return new MemoryDataProvider({
    messages: [
      { topic: "/some_topic1", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
      { topic: "/some_topic1", receiveTime: { sec: 103, nsec: 0 }, message: { value: 3 } },
    ],
    topics: [{ name: "/some_topic1", datatype: "some_datatype" }],
    datatypes: {},
    initiallyLoaded,
    providesParsedMessages: true,
  });
}

function provider1Duplicate() {
  return new MemoryDataProvider({
    messages: [
      { topic: "/some_topic1", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
      { topic: "/some_topic1", receiveTime: { sec: 103, nsec: 0 }, message: { value: 3 } },
    ],
    topics: [{ name: "/some_topic1", datatype: "some_datatype" }],
    datatypes: {},
    providesParsedMessages: true,
  });
}

function provider2() {
  return new MemoryDataProvider({
    messages: [{ topic: "/some_topic2", receiveTime: { sec: 102, nsec: 0 }, message: { value: 2 } }],
    topics: [{ name: "/some_topic2", datatype: "some_datatype" }],
    datatypes: {},
    providesParsedMessages: true,
  });
}

function provider3() {
  return new MemoryDataProvider({
    messages: [
      { topic: "/some_topic3", receiveTime: { sec: 100, nsec: 0 }, message: { value: 3 } },
      { topic: "/some_topic3", receiveTime: { sec: 102, nsec: 0 }, message: { value: 3 } },
      { topic: "/some_topic3", receiveTime: { sec: 104, nsec: 0 }, message: { value: 3 } },
    ],
    topics: [{ name: "/some_topic3", datatype: "some_datatype" }],
    datatypes: {},
    providesParsedMessages: true,
  });
}

function getCombinedDataProvider(data: any[]) {
  const providerInfos = [];
  const children = [];
  for (const item of data) {
    const { provider, prefix } = item;
    providerInfos.push({});
    // $FlowFixMe: This is not how getProvider is meant to work.
    const childProvider = prefix == null ? provider : new RenameDataProvider({ prefix }, [provider], (child) => child);
    children.push({ name: "TestProvider", args: { provider: childProvider }, children: [] });
  }
  return new CombinedDataProvider({ providerInfos }, children, () => {
    throw new Error("Should never be called");
  });
}

describe("CombinedDataProvider", () => {
  describe("error handling", () => {
    it("throws if two providers have the same topics without a prefix", async () => {
      const combinedProvider = getCombinedDataProvider([{ provider: provider1() }, { provider: provider1Duplicate() }]);
      await expect(combinedProvider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
    });

    it("should not allow duplicate topics", async () => {
      const p1 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        datatypes: {},
        providesParsedMessages: true,
      });
      const p2 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/generic_topic/some_topic", datatype: "some_datatype" }],
        datatypes: {},
        providesParsedMessages: true,
      });
      const combinedProvider = getCombinedDataProvider([{ provider: p1, prefix: "/generic_topic" }, { provider: p2 }]);
      await expect(combinedProvider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
    });

    it("should not allow conflicting datatypes", async () => {
      const p1 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        datatypes: {
          some_datatype: {
            fields: [
              {
                name: "some_string",
                type: "string",
              },
            ],
          },
        },
        providesParsedMessages: true,
      });

      const p2 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        datatypes: {
          some_datatype: {
            fields: [
              {
                name: "some_string",
                type: "number",
              },
            ],
          },
        },
        providesParsedMessages: true,
      });
      const combinedProvider = getCombinedDataProvider([{ provider: p1, prefix: "/some_prefix" }, { provider: p2 }]);
      await expect(combinedProvider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
    });

    it("should not allow overlapping topics in messageDefinitionsByTopic", async () => {
      const datatypes = { some_datatype: { fields: [{ name: "value", type: "int32" }] } };
      const p1 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        messageDefinitionsByTopic: { "/some_topic": "int32 value" },
        datatypes,
        providesParsedMessages: true,
      });

      const p2 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic2", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic2", datatype: "some_datatype" }],
        datatypes,
        messageDefinitionsByTopic: { "/some_topic": "int32 value" },
        providesParsedMessages: true,
      });
      const combinedProvider = getCombinedDataProvider([{ provider: p1 }, { provider: p2 }]);
      await expect(combinedProvider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow(
        "Duplicate topic found"
      );
    });

    it("should not mixed parsed and unparsed messaages", async () => {
      const datatypes = { some_datatype: { fields: [{ name: "value", type: "int32" }] } };
      const p1 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        messageDefinitionsByTopic: { "/some_topic": "int32 value" },
        datatypes,
        providesParsedMessages: true,
      });

      const p2 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic2", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic2", datatype: "some_datatype" }],
        datatypes,
        messageDefinitionsByTopic: { "/some_topic2": "int32 value" },
        providesParsedMessages: false,
      });
      const combinedProvider = getCombinedDataProvider([{ provider: p1 }, { provider: p2 }]);
      await expect(combinedProvider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow(
        "Data providers provide different message formats"
      );
    });
  });

  describe("features", () => {
    it("combines initialization data", async () => {
      const combinedProvider = getCombinedDataProvider([
        { provider: provider1() },
        { provider: provider3(), prefix: SECOND_SOURCE_PREFIX },
        { provider: provider2(), prefix: "/table_1" },
      ]);
      expect(await combinedProvider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
        start: { nsec: 0, sec: 100 },
        end: { nsec: 0, sec: 104 },
        topics: [
          { datatype: "some_datatype", name: "/some_topic1", numMessages: undefined },
          { datatype: "some_datatype", name: `${SECOND_SOURCE_PREFIX}/some_topic3`, originalTopic: "/some_topic3" },
          {
            datatype: "some_datatype",
            name: "/table_1/some_topic2",
            originalTopic: "/some_topic2",
            numMessages: undefined,
          },
        ],
        datatypes: {},
        messageDefinitionsByTopic: {},
        providesParsedMessages: true,
      });
    });

    it("combines messages", async () => {
      const combinedProvider = getCombinedDataProvider([
        { provider: provider1() },
        { provider: provider1Duplicate(), prefix: SECOND_SOURCE_PREFIX },
      ]);
      await combinedProvider.initialize(mockExtensionPoint().extensionPoint);
      expect(
        await combinedProvider.getMessages({ sec: 101, nsec: 0 }, { sec: 103, nsec: 0 }, [
          "/some_topic1",
          `${SECOND_SOURCE_PREFIX}/some_topic1`,
        ])
      ).toEqual([
        { message: { value: 1 }, receiveTime: { nsec: 0, sec: 101 }, topic: "/some_topic1" },
        { message: { value: 1 }, receiveTime: { nsec: 0, sec: 101 }, topic: `${SECOND_SOURCE_PREFIX}/some_topic1` },
        { message: { value: 3 }, receiveTime: { nsec: 0, sec: 103 }, topic: "/some_topic1" },
        { message: { value: 3 }, receiveTime: { nsec: 0, sec: 103 }, topic: `${SECOND_SOURCE_PREFIX}/some_topic1` },
      ]);
    });

    it("does not call getMessages with out of bound times", async () => {
      const p1 = new MemoryDataProvider({
        messages: [
          { topic: "/some_topic", receiveTime: { sec: 100, nsec: 0 }, message: undefined },
          { topic: "/some_topic", receiveTime: { sec: 130, nsec: 0 }, message: undefined },
        ],
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        datatypes: {},
        providesParsedMessages: true,
      });
      jest.spyOn(p1, "getMessages");
      const p2 = new MemoryDataProvider({
        messages: [
          { topic: "/some_topic2", receiveTime: { sec: 170, nsec: 0 }, message: undefined },
          { topic: "/some_topic2", receiveTime: { sec: 200, nsec: 0 }, message: undefined },
        ],
        topics: [{ name: "/some_topic2", datatype: "some_datatype" }],
        datatypes: {},
        providesParsedMessages: true,
      });
      jest.spyOn(p2, "getMessages");
      const combinedProvider = getCombinedDataProvider([{ provider: p1 }, { provider: p2 }]);
      const result = await combinedProvider.initialize(mockExtensionPoint().extensionPoint);

      // Sanity check:
      expect(result.start).toEqual({ sec: 100, nsec: 0 });
      expect(result.end).toEqual({ sec: 200, nsec: 0 });

      const messages = await combinedProvider.getMessages({ sec: 100, nsec: 0 }, { sec: 150, nsec: 0 }, [
        "/some_topic",
        "/some_topic2",
      ]);
      expect(messages.length).toEqual(2);
      expect(p1.getMessages.mock.calls[0]).toEqual([{ sec: 100, nsec: 0 }, { sec: 130, nsec: 0 }, ["/some_topic"]]);
      expect(p2.getMessages.mock.calls.length).toEqual(0);
    });
  });

  describe("extensionPoint", () => {
    describe("progressCallback", () => {
      it("calls progressCallback with the progress data passed from child provider", async () => {
        const p1 = provider1();
        const combinedProvider = getCombinedDataProvider([{ provider: p1, prefix: "/generic_topic" }]);
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);
        p1.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }] });
        const calls = mockProgressCallback.mock.calls;
        expect(calls[calls.length - 1]).toEqual([{ fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }] }]);
      });

      it("intersects progress from multiple child providers", async () => {
        const p1 = provider1();
        const p2 = provider2();
        const combinedProvider = getCombinedDataProvider([
          { provider: p1, prefix: "/generic_topic" },
          { provider: p2 },
        ]);
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);
        p1.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0.1, end: 0.5 }] });
        let calls = mockProgressCallback.mock.calls;
        // Assume that p2 has no progress yet since it has not reported, so intersected range is empty
        expect(calls[calls.length - 1]).toEqual([{ fullyLoadedFractionRanges: [] }]);
        p2.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 0.3 }] });
        calls = mockProgressCallback.mock.calls;
        expect(calls[calls.length - 1]).toEqual([{ fullyLoadedFractionRanges: [{ end: 0.3, start: 0.1 }] }]);
      });

      it("assumes providers that don't report progress in initialize are fully loaded", async () => {
        const p1 = provider1(true);
        const p2 = provider2();
        const combinedProvider = getCombinedDataProvider([
          { provider: p1, prefix: "/generic_topic" },
          { provider: p2 },
        ]);
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);
        p2.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0.1, end: 0.5 }] });
        const calls = mockProgressCallback.mock.calls;
        // Assume that p1 is fully loaded since it did not report during initialize, so intersected range is the one from p2
        expect(calls[calls.length - 1]).toEqual([{ fullyLoadedFractionRanges: [{ start: 0.1, end: 0.5 }] }]);
      });

      it("reflects progress for only the providers which are needed for topics passed to getMessages", async () => {
        const p1 = provider1();
        const p2 = provider2();
        const combinedProvider = getCombinedDataProvider([
          { provider: p1, prefix: "/generic_topic" },
          { provider: p2 },
        ]);
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);
        p2.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 0.3 }] });
        let calls = mockProgressCallback.mock.calls;
        // Assume that p1 has no progress yet since it has not reported, so intersected range is empty
        expect(calls[calls.length - 1]).toEqual([{ fullyLoadedFractionRanges: [] }]);
        combinedProvider.getMessages({ sec: 0, nsec: 0 }, { sec: 0.1, nsec: 0 }, ["/some_topic2"]);
        // Reflects progress of only p2, since no topics from p1 are being requested.
        calls = mockProgressCallback.mock.calls;
        expect(calls[calls.length - 1]).toEqual([{ fullyLoadedFractionRanges: [{ start: 0, end: 0.3 }] }]);
      });

      it("merges blocks when start times line up", async () => {
        const p1 = provider1();
        const p2 = provider2();
        const combinedProvider = getCombinedDataProvider([
          { provider: p1, prefix: "/generic_topic" },
          { provider: p2 },
        ]);
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);

        p1.extensionPoint.progressCallback({
          fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }],
          messageCache: {
            startTime: { sec: 100, nsec: 0 },
            blocks: [{ sizeInBytes: 99, messagesByTopic: { "/some_topic1": [] } }],
          },
        });
        p2.extensionPoint.progressCallback({
          fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }],
          messageCache: {
            startTime: { sec: 100, nsec: 0 },
            blocks: [{ sizeInBytes: 9, messagesByTopic: { "/some_topic2": [] } }],
          },
        });
        const calls = mockProgressCallback.mock.calls;
        expect(calls[calls.length - 1][0].messageCache).toEqual({
          startTime: { sec: 100, nsec: 0 },
          blocks: [
            {
              sizeInBytes: 108,
              messagesByTopic: {
                "/generic_topic/some_topic1": [],
                "/some_topic2": [],
              },
            },
          ],
        });
      });

      it("just returns the first provider's blocks when start times do not line up", async () => {
        const p1 = provider1();
        const p2 = provider2();
        const combinedProvider = getCombinedDataProvider([
          { provider: p1, prefix: "/generic_topic" },
          { provider: p2 },
        ]);
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);

        p1.extensionPoint.progressCallback({
          fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }],
          messageCache: {
            startTime: { sec: 100, nsec: 0 },
            blocks: [{ sizeInBytes: 99, messagesByTopic: { "/some_topic1": [] } }],
          },
        });
        p2.extensionPoint.progressCallback({
          fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }],
          messageCache: {
            startTime: { sec: 101, nsec: 0 },
            blocks: [{ sizeInBytes: 9, messagesByTopic: { "/some_topic2": [] } }],
          },
        });
        const calls = mockProgressCallback.mock.calls;
        expect(calls[calls.length - 1][0].messageCache).toEqual({
          startTime: { sec: 100, nsec: 0 },
          blocks: [
            {
              sizeInBytes: 99,
              messagesByTopic: {
                "/generic_topic/some_topic1": [],
              },
            },
          ],
        });
      });
    });

    describe("reportMetadataCallback", () => {
      it("calls reportMetadataCallback with the progress data passed from child provider", async () => {
        const p1 = provider1();
        const combinedProvider = getCombinedDataProvider([{ provider: p1, prefix: "/generic_topic" }]);
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockReportMetadataCallback = jest.spyOn(extensionPoint, "reportMetadataCallback");
        await combinedProvider.initialize(extensionPoint);
        p1.extensionPoint.reportMetadataCallback({ type: "updateReconnecting", reconnecting: true });
        expect(mockReportMetadataCallback.mock.calls).toEqual([[{ reconnecting: true, type: "updateReconnecting" }]]);
      });
    });
  });
});

describe("mergedBlocks", () => {
  it("can 'merge' two empty blocks", () => {
    expect(
      mergedBlocks(
        { startTime: { sec: 0, nsec: 0 }, blocks: [undefined] },
        { startTime: { sec: 0, nsec: 0 }, blocks: [undefined] }
      )
    ).toEqual({ startTime: { sec: 0, nsec: 0 }, blocks: [undefined] });
  });

  it("incorrectly 'merges' non-overlapping blocks", () => {
    expect(
      mergedBlocks(
        { startTime: { sec: 0, nsec: 0 }, blocks: [undefined] },
        { startTime: fromMillis(100), blocks: [undefined] }
      )
    ).toEqual({ startTime: { sec: 0, nsec: 0 }, blocks: [undefined] });
  });

  it("can 'merge' an empty block with a real one", () => {
    expect(
      mergedBlocks(
        { startTime: { sec: 0, nsec: 0 }, blocks: [undefined] },
        { startTime: { sec: 0, nsec: 0 }, blocks: [{ sizeInBytes: 0, messagesByTopic: {} }] }
      )
    ).toEqual({
      startTime: { sec: 0, nsec: 0 },
      blocks: [{ sizeInBytes: 0, messagesByTopic: {} }],
    });
  });

  it("can 'merge' a real block with an empty one", () => {
    expect(
      mergedBlocks(
        { startTime: { sec: 0, nsec: 0 }, blocks: [{ sizeInBytes: 0, messagesByTopic: {} }] },
        { startTime: { sec: 0, nsec: 0 }, blocks: [undefined] }
      )
    ).toEqual({ startTime: { sec: 0, nsec: 0 }, blocks: [{ sizeInBytes: 0, messagesByTopic: {} }] });
  });

  it("can merge two real blocks", () => {
    expect(
      mergedBlocks(
        { startTime: { sec: 0, nsec: 0 }, blocks: [{ sizeInBytes: 1, messagesByTopic: { "/foo": [] } }] },
        { startTime: { sec: 0, nsec: 0 }, blocks: [{ sizeInBytes: 2, messagesByTopic: { "/bar": [] } }] }
      )
    ).toEqual({
      startTime: { sec: 0, nsec: 0 },
      blocks: [{ sizeInBytes: 3, messagesByTopic: { "/foo": [], "/bar": [] } }],
    });
  });

  it("works when the first set of blocks is longer", () => {
    expect(
      mergedBlocks(
        { startTime: { sec: 0, nsec: 0 }, blocks: [undefined, { sizeInBytes: 1, messagesByTopic: { "/foo": [] } }] },
        { startTime: { sec: 0, nsec: 0 }, blocks: [{ sizeInBytes: 2, messagesByTopic: { "/bar": [] } }] }
      )
    ).toEqual({
      startTime: { sec: 0, nsec: 0 },
      blocks: [
        { sizeInBytes: 2, messagesByTopic: { "/bar": [] } },
        { sizeInBytes: 1, messagesByTopic: { "/foo": [] } },
      ],
    });
  });

  it("works when the second set of blocks is longer", () => {
    expect(
      mergedBlocks(
        { startTime: { sec: 0, nsec: 0 }, blocks: [{ sizeInBytes: 1, messagesByTopic: { "/foo": [] } }] },
        { startTime: { sec: 0, nsec: 0 }, blocks: [undefined, { sizeInBytes: 2, messagesByTopic: { "/bar": [] } }] }
      )
    ).toEqual({
      startTime: { sec: 0, nsec: 0 },
      blocks: [
        { sizeInBytes: 1, messagesByTopic: { "/foo": [] } },
        { sizeInBytes: 2, messagesByTopic: { "/bar": [] } },
      ],
    });
  });

  it("memoizes merges", () => {
    const lhs = { sizeInBytes: 1, messagesByTopic: {} };
    const lhsMessagesByTopic = jest.fn().mockReturnValue({ foo: [] });
    // $FlowFixMe: Flow wants a "value", and we can't specify both "value" and "get".
    Object.defineProperty(lhs, "messagesByTopic", { get: lhsMessagesByTopic });

    const rhs = { sizeInBytes: 2, messagesByTopic: {} };
    const rhsMessagesByTopic = jest.fn().mockReturnValue({ bar: [] });
    // $FlowFixMe: Flow wants a "value", and we can't specify both "value" and "get".
    Object.defineProperty(rhs, "messagesByTopic", { get: rhsMessagesByTopic });

    const mergedValue = mergedBlocks(
      { startTime: { sec: 0, nsec: 0 }, blocks: [lhs] },
      { startTime: { sec: 0, nsec: 0 }, blocks: [rhs] }
    );
    if (mergedValue == null) {
      throw new Error("satisfy flow");
    }
    const combinedBlocks = mergedValue.blocks;
    expect(mergedValue).toEqual({
      startTime: { sec: 0, nsec: 0 },
      blocks: [{ sizeInBytes: 3, messagesByTopic: { foo: [], bar: [] } }],
    });
    expect(lhsMessagesByTopic.mock.calls.length).toBe(1);
    expect(rhsMessagesByTopic.mock.calls.length).toBe(1);

    // Value unchanged.
    const newMergedValue = mergedBlocks(
      { startTime: { sec: 0, nsec: 0 }, blocks: [lhs] },
      { startTime: { sec: 0, nsec: 0 }, blocks: [rhs] }
    );
    if (newMergedValue == null) {
      throw new Error("satisfy flow");
    }
    const newCombinedBlocks = newMergedValue.blocks;
    expect(newMergedValue).toEqual(mergedValue);
    expect(newCombinedBlocks[0]).toBe(combinedBlocks[0]);
    // Whole array does not keep identity. Not super important.
    expect(newCombinedBlocks).not.toBe(combinedBlocks);
    // Have not looked at the data aagain, even though we've called mergedBlocks three more times.
    expect(lhsMessagesByTopic.mock.calls.length).toBe(1);
    expect(rhsMessagesByTopic.mock.calls.length).toBe(1);
  });
});
