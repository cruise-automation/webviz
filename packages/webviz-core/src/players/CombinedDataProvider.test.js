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

import CombinedDataProvider from "webviz-core/src/players/CombinedDataProvider";
import MemoryDataProvider from "webviz-core/src/players/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/players/mockExtensionPoint";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

// reusable providers
const provider1 = new MemoryDataProvider({
  messages: [
    { topic: "/some_topic1", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
    { topic: "/some_topic1", receiveTime: { sec: 103, nsec: 0 }, message: { value: 3 } },
  ],
  topics: [{ name: "/some_topic1", datatype: "some_datatype" }],
  datatypes: {},
});

const provider1Duplicate = new MemoryDataProvider({
  messages: [
    { topic: "/some_topic1", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
    { topic: "/some_topic1", receiveTime: { sec: 103, nsec: 0 }, message: { value: 3 } },
  ],
  topics: [{ name: "/some_topic1", datatype: "some_datatype" }],
  datatypes: {},
});

const provider2 = new MemoryDataProvider({
  messages: [{ topic: "/some_topic2", receiveTime: { sec: 102, nsec: 0 }, message: { value: 2 } }],
  topics: [{ name: "/some_topic2", datatype: "some_datatype" }],
  datatypes: {},
});

const provider3 = new MemoryDataProvider({
  messages: [
    { topic: "/some_topic3", receiveTime: { sec: 100, nsec: 0 }, message: { value: 3 } },
    { topic: "/some_topic3", receiveTime: { sec: 102, nsec: 0 }, message: { value: 3 } },
    { topic: "/some_topic3", receiveTime: { sec: 104, nsec: 0 }, message: { value: 3 } },
  ],
  topics: [{ name: "/some_topic3", datatype: "some_datatype" }],
  datatypes: {},
});

describe("CombinedDataProvider", () => {
  describe("error handling", () => {
    it("throws if a prefix does not have a leading forward slash", () => {
      expect(
        () => new CombinedDataProvider([{ provider: provider1, prefix: "foo" }, { provider: provider2 }])
      ).toThrow();
    });

    it("throws if two providers have the same topics without a prefix", async () => {
      const combinedProvider = new CombinedDataProvider([{ provider: provider1 }, { provider: provider1Duplicate }]);
      await expect(combinedProvider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
    });

    it("throws if duplicate prefixes are provided", () => {
      expect(
        () =>
          new CombinedDataProvider([{ provider: provider1, prefix: "/foo" }, { provider: provider2, prefix: "/foo" }])
      ).toThrow();
      expect(
        () =>
          new CombinedDataProvider([
            { provider: provider1, prefix: "/foo" },
            { provider: provider2 },
            { provider: provider3, prefix: "/foo" },
          ])
      ).toThrow();
    });

    it("should not allow duplicate topics", async () => {
      const provider1 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        datatypes: {},
      });

      const provider2 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/generic_topic/some_topic", datatype: "some_datatype" }],
        datatypes: {},
      });
      const combinedProvider = new CombinedDataProvider([
        { provider: provider1, prefix: "/generic_topic" },
        { provider: provider2 },
      ]);
      await expect(combinedProvider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
    });

    it("should not allow conflicting datatypes", async () => {
      const provider1 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        datatypes: {
          some_datatype: [
            {
              name: "some_string",
              type: "string",
            },
          ],
        },
      });

      const provider2 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        datatypes: {
          some_datatype: [
            {
              name: "some_string",
              type: "number",
            },
          ],
        },
      });
      const combinedProvider = new CombinedDataProvider([
        { provider: provider1, prefix: "/some_prefix" },
        { provider: provider2 },
      ]);
      await expect(combinedProvider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
    });
  });
  describe("features", () => {
    it("combines initialization data", async () => {
      const combinedProvider = new CombinedDataProvider([
        { provider: provider1 },
        { provider: provider3, prefix: SECOND_BAG_PREFIX },
        { provider: provider2, prefix: "/table_1" },
      ]);
      expect(await combinedProvider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
        datatypes: {},
        end: { nsec: 0, sec: 104 },
        start: { nsec: 0, sec: 100 },
        topics: [
          { datatype: "some_datatype", name: "/some_topic1" },
          { datatype: "some_datatype", name: `${SECOND_BAG_PREFIX}/some_topic3`, originalTopic: "/some_topic3" },
          { datatype: "some_datatype", name: "/table_1/some_topic2", originalTopic: "/some_topic2" },
        ],
      });
    });

    describe("delete topics", () => {
      const providerWithTopicToDelete = new MemoryDataProvider({
        messages: [
          { topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
          { topic: "/some_topic_to_delete", receiveTime: { sec: 103, nsec: 0 }, message: { value: 3 } },
        ],
        topics: [
          { name: "/some_topic", datatype: "some_datatype" },
          { name: "/some_topic_to_delete", datatype: "some_datatype" },
        ],
        datatypes: {},
      });
      it("delete topics from providers", async () => {
        const combinedProvider = new CombinedDataProvider([
          { provider: provider1 },
          {
            provider: providerWithTopicToDelete,
            deleteTopics: ["/some_topic_to_delete"],
          },
        ]);
        expect(await combinedProvider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
          datatypes: {},
          end: { nsec: 0, sec: 103 },
          start: { nsec: 0, sec: 101 },
          topics: [
            { datatype: "some_datatype", name: "/some_topic1" },
            { datatype: "some_datatype", name: "/some_topic" },
          ],
        });
      });

      it("delete topics from providers with prefix", async () => {
        const combinedProvider = new CombinedDataProvider([
          { provider: provider1 },
          {
            provider: providerWithTopicToDelete,
            prefix: "/table_1",
            deleteTopics: ["/table_1/some_topic_to_delete"],
          },
        ]);
        expect(await combinedProvider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
          datatypes: {},
          end: { nsec: 0, sec: 103 },
          start: { nsec: 0, sec: 101 },
          topics: [
            { datatype: "some_datatype", name: "/some_topic1" },
            { datatype: "some_datatype", name: "/table_1/some_topic", originalTopic: "/some_topic" },
          ],
        });
      });
    });

    it("combines messages", async () => {
      const combinedProvider = new CombinedDataProvider([
        { provider: provider1 },
        { provider: provider1Duplicate, prefix: SECOND_BAG_PREFIX },
      ]);
      await combinedProvider.initialize(mockExtensionPoint().extensionPoint);
      expect(
        await combinedProvider.getMessages({ sec: 101, nsec: 0 }, { sec: 103, nsec: 0 }, [
          "/some_topic1",
          `${SECOND_BAG_PREFIX}/some_topic1`,
        ])
      ).toEqual([
        { message: { value: 1 }, receiveTime: { nsec: 0, sec: 101 }, topic: "/some_topic1" },
        { message: { value: 1 }, receiveTime: { nsec: 0, sec: 101 }, topic: `${SECOND_BAG_PREFIX}/some_topic1` },
        { message: { value: 3 }, receiveTime: { nsec: 0, sec: 103 }, topic: "/some_topic1" },
        { message: { value: 3 }, receiveTime: { nsec: 0, sec: 103 }, topic: `${SECOND_BAG_PREFIX}/some_topic1` },
      ]);
    });
    it("allows customization of prefixes", async () => {
      const combinedProvider = new CombinedDataProvider([
        { provider: provider1, prefix: "/table_1" },
        { provider: provider2, prefix: "/table_2" },
      ]);
      expect(await combinedProvider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
        datatypes: {},
        end: { nsec: 0, sec: 103 },
        start: { nsec: 0, sec: 101 },
        topics: [
          { name: `/table_1/some_topic1`, originalTopic: "/some_topic1", datatype: "some_datatype" },
          { name: `/table_2/some_topic2`, originalTopic: "/some_topic2", datatype: "some_datatype" },
        ],
      });
    });
  });

  describe("extensionPoint", () => {
    describe("progressCallback", () => {
      it("calls progressCallback with the progress data passed from child provider", async () => {
        const combinedProvider = new CombinedDataProvider([{ provider: provider1, prefix: "/generic_topic" }]);
        const extensionPoint = mockExtensionPoint().extensionPoint;
        jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);
        provider1.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }] });
        expect(extensionPoint.progressCallback.mock.calls).toEqual([
          [{ fullyLoadedFractionRanges: [{ end: 0.5, start: 0 }] }],
        ]);
      });
    });
    describe("reportMetadataCallback", () => {
      it("calls reportMetadataCallback with the progress data passed from child provider", async () => {
        const combinedProvider = new CombinedDataProvider([{ provider: provider1, prefix: "/generic_topic" }]);
        const extensionPoint = mockExtensionPoint().extensionPoint;
        jest.spyOn(extensionPoint, "reportMetadataCallback");
        await combinedProvider.initialize(extensionPoint);
        provider1.extensionPoint.reportMetadataCallback({ type: "updateReconnecting", reconnecting: true });
        expect(extensionPoint.reportMetadataCallback.mock.calls).toEqual([
          [{ reconnecting: true, type: "updateReconnecting" }],
        ]);
      });
    });

    describe("addTopicsCallback", () => {
      it("filters out topics that doesn't belong to the child provider", async () => {
        const combinedProvider = new CombinedDataProvider([
          { provider: provider1 },
          { provider: provider2, prefix: "/table_1" },
          { provider: provider3, prefix: SECOND_BAG_PREFIX },
        ]);

        const { extensionPoint, topicCallbacks } = mockExtensionPoint();
        const cbMockProvider2 = jest.fn();
        const cbMockProvider3 = jest.fn();
        jest.spyOn(extensionPoint, "addTopicsCallback");
        await combinedProvider.initialize(extensionPoint);
        provider2.extensionPoint.addTopicsCallback(cbMockProvider2);
        provider3.extensionPoint.addTopicsCallback(cbMockProvider3);
        expect(extensionPoint.addTopicsCallback.mock.calls).toEqual([[expect.any(Function)], [expect.any(Function)]]);
        expect(topicCallbacks).toEqual([expect.any(Function), expect.any(Function)]);

        topicCallbacks.forEach((cb) => {
          cb(["/table_1/some_topic2", `${SECOND_BAG_PREFIX}/some_topic3`]);
        });
        expect(cbMockProvider2).toHaveBeenNthCalledWith(1, ["/some_topic2"]);
        expect(cbMockProvider3).toHaveBeenNthCalledWith(1, ["/some_topic3"]);
      });
    });
  });
});
