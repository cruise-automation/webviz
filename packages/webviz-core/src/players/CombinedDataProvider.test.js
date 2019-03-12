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
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

function getProviders() {
  return {
    provider1: new MemoryDataProvider({
      messages: [
        { topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
        { topic: "/some_topic", receiveTime: { sec: 103, nsec: 0 }, message: { value: 3 } },
      ],
      topics: [{ topic: "/some_topic", datatype: "some_datatype" }],
      datatypes: {},
    }),

    provider2: new MemoryDataProvider({
      messages: [{ topic: "/some_topic", receiveTime: { sec: 102, nsec: 0 }, message: { value: 2 } }],
      topics: [{ topic: "/some_topic", datatype: "some_datatype" }],
      datatypes: {},
    }),

    provider3: new MemoryDataProvider({
      messages: [
        { topic: "/some_topic", receiveTime: { sec: 100, nsec: 0 }, message: { value: 3 } },
        { topic: "/some_topic", receiveTime: { sec: 102, nsec: 0 }, message: { value: 3 } },
        { topic: "/some_topic", receiveTime: { sec: 104, nsec: 0 }, message: { value: 3 } },
      ],
      topics: [{ topic: "/some_topic", datatype: "some_datatype" }],
      datatypes: {},
    }),
  };
}

describe("CombinedDataProvider", () => {
  describe("error handling", () => {
    it("throws if a prefix does not have a leading forward slash", () => {
      const { provider1, provider2 } = getProviders();
      expect(
        () => new CombinedDataProvider([{ provider: provider1, prefix: "foo" }, { provider: provider2 }])
      ).toThrow();
    });
    it("throws if two providers have the same topics without a prefix", async () => {
      const { provider1, provider2 } = getProviders();
      const combinedProvider = new CombinedDataProvider([{ provider: provider1 }, { provider: provider2 }]);
      await expect(combinedProvider.initialize()).rejects.toThrow();
    });
    it("throws if duplicate prefixes are provided", () => {
      const { provider1, provider2, provider3 } = getProviders();
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
        topics: [{ topic: "/some_topic", datatype: "some_datatype" }],
        datatypes: {},
      });

      const provider2 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ topic: "/generic_topic/some_topic", datatype: "some_datatype" }],
        datatypes: {},
      });
      const combinedProvider = new CombinedDataProvider([
        { provider: provider1, prefix: "/generic_topic" },
        { provider: provider2 },
      ]);
      await expect(combinedProvider.initialize()).rejects.toThrow();
    });
    it("should not allow conflicting datatypes", async () => {
      const provider1 = new MemoryDataProvider({
        messages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
        topics: [{ topic: "/some_topic", datatype: "some_datatype" }],
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
        topics: [{ topic: "/some_topic", datatype: "some_datatype" }],
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
      await expect(combinedProvider.initialize()).rejects.toThrow();
    });
  });
  it("combines initialization data", async () => {
    const { provider1, provider2, provider3 } = getProviders();
    const combinedProvider = new CombinedDataProvider([
      { provider: provider1 },
      { provider: provider3, prefix: SECOND_BAG_PREFIX },
      { provider: provider2, prefix: "/table_1" },
    ]);
    expect(await combinedProvider.initialize()).toEqual({
      datatypes: {},
      end: { nsec: 0, sec: 104 },
      start: { nsec: 0, sec: 100 },
      topics: [
        { topic: "/some_topic", datatype: "some_datatype" },
        { topic: `${SECOND_BAG_PREFIX}/some_topic`, originalTopic: "/some_topic", datatype: "some_datatype" },
        { topic: `/table_1/some_topic`, originalTopic: "/some_topic", datatype: "some_datatype" },
      ],
    });
  });

  it("combines messages", async () => {
    const { provider1, provider2 } = getProviders();
    const combinedProvider = new CombinedDataProvider([
      { provider: provider1 },
      { provider: provider2, prefix: SECOND_BAG_PREFIX },
    ]);
    await combinedProvider.initialize();
    expect(
      await combinedProvider.getMessages({ sec: 101, nsec: 0 }, { sec: 103, nsec: 0 }, [
        "/some_topic",
        `${SECOND_BAG_PREFIX}/some_topic`,
      ])
    ).toEqual([
      { message: { value: 1 }, receiveTime: { nsec: 0, sec: 101 }, topic: "/some_topic" },
      { message: { value: 2 }, receiveTime: { nsec: 0, sec: 102 }, topic: `${SECOND_BAG_PREFIX}/some_topic` },
      { message: { value: 3 }, receiveTime: { nsec: 0, sec: 103 }, topic: "/some_topic" },
    ]);
  });
  it("allows customization of prefixes", async () => {
    const { provider1, provider2 } = getProviders();
    const combinedProvider = new CombinedDataProvider([
      { provider: provider1, prefix: "/table_1" },
      { provider: provider2, prefix: "/table_2" },
    ]);
    expect(await combinedProvider.initialize()).toEqual({
      datatypes: {},
      end: { nsec: 0, sec: 103 },
      start: { nsec: 0, sec: 101 },
      topics: [
        { topic: `/table_1/some_topic`, originalTopic: "/some_topic", datatype: "some_datatype" },
        { topic: `/table_2/some_topic`, originalTopic: "/some_topic", datatype: "some_datatype" },
      ],
    });
  });
});
