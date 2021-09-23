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

import { parseMessageDefinition } from "rosbag";

import delay from "webviz-core/shared/delay";
import BagDataProvider from "webviz-core/src/dataProviders/BagDataProvider";
import CombinedDataProvider, { mergedBlocks } from "webviz-core/src/dataProviders/CombinedDataProvider";
import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import RenameDataProvider from "webviz-core/src/dataProviders/RenameDataProvider";
import { type Bobject, type BobjectMessage } from "webviz-core/src/players/types";
import { wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import sendNotification from "webviz-core/src/util/sendNotification";
import { fromMillis } from "webviz-core/src/util/time";

// reusable providers
function provider1(initiallyLoaded = false) {
  return new MemoryDataProvider({
    messages: {
      parsedMessages: [
        { topic: "/some_topic1", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
        { topic: "/some_topic1", receiveTime: { sec: 103, nsec: 0 }, message: { value: 3 } },
      ],
      bobjects: undefined,
      rosBinaryMessages: undefined,
    },
    topics: [{ name: "/some_topic1", datatype: "some_datatype" }],
    datatypes: {},
    initiallyLoaded,
    providesParsedMessages: true,
  });
}

function provider1Duplicate() {
  return new MemoryDataProvider({
    messages: {
      parsedMessages: [
        { topic: "/some_topic1", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
        { topic: "/some_topic1", receiveTime: { sec: 103, nsec: 0 }, message: { value: 3 } },
      ],
      bobjects: undefined,
      rosBinaryMessages: undefined,
    },
    topics: [{ name: "/some_topic1", datatype: "some_datatype" }],
    datatypes: {},
    providesParsedMessages: true,
  });
}

function provider2() {
  return new MemoryDataProvider({
    messages: {
      parsedMessages: [{ topic: "/some_topic2", receiveTime: { sec: 102, nsec: 0 }, message: { value: 2 } }],
      bobjects: undefined,
      rosBinaryMessages: undefined,
    },
    topics: [{ name: "/some_topic2", datatype: "some_datatype" }],
    datatypes: {},
    providesParsedMessages: true,
  });
}

function provider3() {
  return new MemoryDataProvider({
    messages: {
      parsedMessages: [
        { topic: "/some_topic3", receiveTime: { sec: 100, nsec: 0 }, message: { value: 3 } },
        { topic: "/some_topic3", receiveTime: { sec: 102, nsec: 0 }, message: { value: 3 } },
        { topic: "/some_topic3", receiveTime: { sec: 104, nsec: 0 }, message: { value: 3 } },
      ],
      bobjects: undefined,
      rosBinaryMessages: undefined,
    },
    topics: [{ name: "/some_topic3", datatype: "some_datatype" }],
    datatypes: {},
    providesParsedMessages: true,
  });
}

function provider4() {
  const wrappedTime: Bobject = wrapJsObject({}, "time", { sec: 0, nsec: 0 });
  return new MemoryDataProvider({
    messages: {
      parsedMessages: [{ topic: "/parsed", receiveTime: { sec: 102, nsec: 0 }, message: { value: 3 } }],
      bobjects: [({ topic: "/bobject", receiveTime: { sec: 102, nsec: 0 }, message: wrappedTime }: BobjectMessage)],
      rosBinaryMessages: [{ topic: "/rosbinary", receiveTime: { sec: 102, nsec: 0 }, message: new ArrayBuffer(1) }],
    },
    topics: [
      { name: "/parsed", datatype: "some_datatype" },
      { name: "/bobject", datatype: "time" },
      { name: "/rosbinary", datatype: "asdf" },
    ],
    datatypes: {},
    providesParsedMessages: true,
  });
}

function brokenProvider() {
  return new BagDataProvider({ bagPath: { type: "file", file: "not a real file" } }, []);
}

function getCombinedDataProvider(data: any[]) {
  const providerInfos = [];
  const children = [];
  for (const item of data) {
    const { provider, prefix } = item;
    providerInfos.push({});
    const topicMapping = prefix != null && { [prefix]: { excludeTopics: [] } };
    const childProvider = topicMapping
      ? // $FlowFixMe: This is not how getProvider is meant to work.
        new RenameDataProvider({ topicMapping }, [provider], (child) => child)
      : provider;
    children.push({ name: "TestProvider", args: { provider: childProvider }, children: [] });
  }
  return new CombinedDataProvider({ providerInfos }, children, () => {
    throw new Error("Should never be called");
  });
}

describe("CombinedDataProvider", () => {
  describe("error handling", () => {
    it("does not throw if two providers have the same topics without a prefix", async () => {
      const combinedProvider = getCombinedDataProvider([{ provider: provider1() }, { provider: provider1Duplicate() }]);
      await combinedProvider.initialize(mockExtensionPoint().extensionPoint);
    });

    it("allows duplicate topics", async () => {
      const p1 = new MemoryDataProvider({
        messages: {
          parsedMessages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        datatypes: {},
        providesParsedMessages: true,
      });
      const p2 = new MemoryDataProvider({
        messages: {
          parsedMessages: [
            { topic: "/generic_topic/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
          ],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics: [{ name: "/generic_topic/some_topic", datatype: "some_datatype" }],
        datatypes: {},
        providesParsedMessages: true,
      });
      const combinedProvider = getCombinedDataProvider([{ provider: p1, prefix: "/generic_topic" }, { provider: p2 }]);
      await combinedProvider.initialize(mockExtensionPoint().extensionPoint);
      // Merges messages on the same topic from child providers.
      const data = await combinedProvider.getMessages(
        { sec: 100, nsec: 0 },
        { sec: 102, nsec: 0 },
        { parsedMessages: ["/generic_topic/some_topic"] }
      );
      expect(data.parsedMessages).toEqual([
        { topic: "/generic_topic/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
        { topic: "/generic_topic/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
      ]);
    });

    it("should not allow conflicting datatypes", async () => {
      const p1 = new MemoryDataProvider({
        messages: {
          parsedMessages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
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
        messages: {
          parsedMessages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
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

    it("allows overlapping topics in messageDefinitionsByTopic", async () => {
      const datatypes = { some_datatype: { fields: [{ name: "value", type: "int32" }] } };
      const p1 = new MemoryDataProvider({
        messages: {
          parsedMessages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        messageDefinitionsByTopic: { "/some_topic": "int32 value" },
        datatypes,
        providesParsedMessages: true,
      });

      const p2 = new MemoryDataProvider({
        messages: {
          parsedMessages: [{ topic: "/some_topic2", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics: [{ name: "/some_topic2", datatype: "some_datatype" }],
        datatypes,
        messageDefinitionsByTopic: { "/some_topic": "int32 value" },
        providesParsedMessages: true,
      });
      const combinedProvider = getCombinedDataProvider([{ provider: p1 }, { provider: p2 }]);
      await combinedProvider.initialize(mockExtensionPoint().extensionPoint);
    });

    it("should not mixed parsed and unparsed messaages", async () => {
      const datatypes = { some_datatype: { fields: [{ name: "value", type: "int32" }] } };
      const p1 = new MemoryDataProvider({
        messages: {
          parsedMessages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        messageDefinitionsByTopic: { "/some_topic": "int32 value" },
        datatypes,
        providesParsedMessages: true,
      });

      const p2 = new MemoryDataProvider({
        messages: {
          parsedMessages: [{ topic: "/some_topic2", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
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

    it("should let users see results from one provider when another fails", async () => {
      const datatypes = { some_datatype: { fields: [{ name: "value", type: "int32" }] } };
      const message = { topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } };
      const topics = [{ name: "/some_topic", datatype: "some_datatype" }];
      const p1 = new MemoryDataProvider({
        messages: {
          parsedMessages: [message],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics,
        messageDefinitionsByTopic: { "/some_topic": "int32 value" },
        datatypes,
        providesParsedMessages: true,
      });

      const p2 = brokenProvider();
      const combinedProvider = getCombinedDataProvider([{ provider: p1 }, { provider: p2 }]);
      const initResult = await combinedProvider.initialize(mockExtensionPoint().extensionPoint);
      expect(initResult).toEqual(
        expect.objectContaining({
          start: message.receiveTime,
          end: message.receiveTime,
          topics,
        })
      );
      const messagesResult = await combinedProvider.getMessages(
        { sec: 101, nsec: 0 },
        { sec: 101, nsec: 0 },
        { parsedMessages: ["/some_topic"] }
      );
      expect(messagesResult).toEqual({ parsedMessages: [message] });
      sendNotification.expectCalledDuringTest();
    });
  });

  describe("features", () => {
    it("combines initialization data", async () => {
      const combinedProvider = getCombinedDataProvider([
        { provider: provider1() },
        { provider: provider3(), prefix: $WEBVIZ_SOURCE_2 },
        { provider: provider2(), prefix: "/table_1" },
      ]);
      expect(await combinedProvider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
        start: { nsec: 0, sec: 100 },
        end: { nsec: 0, sec: 104 },
        topics: [
          { datatype: "some_datatype", name: "/some_topic1", numMessages: undefined },
          { datatype: "some_datatype", name: `${$WEBVIZ_SOURCE_2}/some_topic3`, originalTopic: "/some_topic3" },
          {
            datatype: "some_datatype",
            name: "/table_1/some_topic2",
            originalTopic: "/some_topic2",
            numMessages: undefined,
          },
        ],
        messageDefinitions: {
          type: "parsed",
          datatypes: {},
          messageDefinitionsByTopic: {},
          parsedMessageDefinitionsByTopic: {},
        },
        providesParsedMessages: true,
      });
    });

    it("combines message definitions", async () => {
      const p1 = new MemoryDataProvider({
        messages: {
          parsedMessages: [{ topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        messageDefinitionsByTopic: { "/some_topic": "int32 value" },
        parsedMessageDefinitionsByTopic: { "/some_topic": parseMessageDefinition("int32 value") },
        datatypes: { some_datatype: { fields: [{ name: "value", type: "int32" }] } },
        providesParsedMessages: true,
      });

      const p2 = new MemoryDataProvider({
        messages: {
          parsedMessages: [{ topic: "/some_topic_2", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics: [{ name: "/some_topic_2", datatype: "some_datatype_2" }],
        messageDefinitionsByTopic: { "/some_topic_2": "int16 value" },
        parsedMessageDefinitionsByTopic: { "/some_topic_2": parseMessageDefinition("int16 value") },
        datatypes: { some_datatype_2: { fields: [{ name: "value", type: "int16" }] } },
        providesParsedMessages: true,
      });

      const p3 = new MemoryDataProvider({
        messages: {
          parsedMessages: [{ topic: "/some_topic_3", receiveTime: { sec: 101, nsec: 0 }, message: { value: "h" } }],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics: [{ name: "/some_topic_3", datatype: "some_datatype_3" }],
        messageDefinitionsByTopic: { "/some_topic_3": "string value" },
        parsedMessageDefinitionsByTopic: { "/some_topic_3": parseMessageDefinition("string value") },
        datatypes: { some_datatype_3: { fields: [{ name: "value", type: "string" }] } },
        providesParsedMessages: true,
      });

      const combinedProvider = getCombinedDataProvider([{ provider: p1 }, { provider: p2 }, { provider: p3 }]);
      expect(await combinedProvider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
        start: { nsec: 0, sec: 101 },
        end: { nsec: 0, sec: 101 },
        topics: [
          { name: "/some_topic", datatype: "some_datatype" },
          { name: "/some_topic_2", datatype: "some_datatype_2" },
          { name: "/some_topic_3", datatype: "some_datatype_3" },
        ],
        messageDefinitions: {
          type: "parsed",
          datatypes: {
            some_datatype: { fields: [{ name: "value", type: "int32" }] },
            some_datatype_2: { fields: [{ name: "value", type: "int16" }] },
            some_datatype_3: { fields: [{ name: "value", type: "string" }] },
          },
          messageDefinitionsByTopic: {
            "/some_topic": "int32 value",
            "/some_topic_2": "int16 value",
            "/some_topic_3": "string value",
          },
          parsedMessageDefinitionsByTopic: {
            "/some_topic": parseMessageDefinition("int32 value"),
            "/some_topic_2": parseMessageDefinition("int16 value"),
            "/some_topic_3": parseMessageDefinition("string value"),
          },
        },
        providesParsedMessages: true,
      });
    });

    it("initializes providers in parallel", async () => {
      const p1 = provider1();
      const p2 = provider2();
      const neverResolvedPromise = new Promise(() => {});
      jest.spyOn(p1, "initialize").mockImplementation(() => neverResolvedPromise);
      jest.spyOn(p2, "initialize").mockImplementation(() => neverResolvedPromise);

      const combinedProvider = getCombinedDataProvider([{ provider: p1 }, { provider: p2, prefix: $WEBVIZ_SOURCE_2 }]);

      combinedProvider.initialize(mockExtensionPoint().extensionPoint);
      await delay(1);

      expect(p1.initialize).toHaveBeenCalled();
      expect(p2.initialize).toHaveBeenCalled();
    });

    it("combines messages", async () => {
      const combinedProvider = getCombinedDataProvider([
        { provider: provider1() },
        { provider: provider1Duplicate(), prefix: $WEBVIZ_SOURCE_2 },
      ]);
      await combinedProvider.initialize(mockExtensionPoint().extensionPoint);
      const result = await combinedProvider.getMessages(
        { sec: 101, nsec: 0 },
        { sec: 103, nsec: 0 },
        { parsedMessages: ["/some_topic1", `${$WEBVIZ_SOURCE_2}/some_topic1`] }
      );
      expect(result.bobjects).toBe(undefined);
      expect(result.rosBinaryMessages).toBe(undefined);
      expect(result.parsedMessages).toEqual([
        { message: { value: 1 }, receiveTime: { nsec: 0, sec: 101 }, topic: "/some_topic1" },
        { message: { value: 1 }, receiveTime: { nsec: 0, sec: 101 }, topic: `${$WEBVIZ_SOURCE_2}/some_topic1` },
        { message: { value: 3 }, receiveTime: { nsec: 0, sec: 103 }, topic: "/some_topic1" },
        { message: { value: 3 }, receiveTime: { nsec: 0, sec: 103 }, topic: `${$WEBVIZ_SOURCE_2}/some_topic1` },
      ]);
    });

    it("does not call getMessages with out of bound times", async () => {
      const p1 = new MemoryDataProvider({
        messages: {
          parsedMessages: [
            { topic: "/some_topic", receiveTime: { sec: 100, nsec: 0 }, message: undefined },
            { topic: "/some_topic", receiveTime: { sec: 130, nsec: 0 }, message: undefined },
          ],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
        topics: [{ name: "/some_topic", datatype: "some_datatype" }],
        datatypes: {},
        providesParsedMessages: true,
      });
      jest.spyOn(p1, "getMessages");
      const p2 = new MemoryDataProvider({
        messages: {
          parsedMessages: [
            { topic: "/some_topic2", receiveTime: { sec: 170, nsec: 0 }, message: undefined },
            { topic: "/some_topic2", receiveTime: { sec: 200, nsec: 0 }, message: undefined },
          ],
          bobjects: undefined,
          rosBinaryMessages: undefined,
        },
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

      const messages = await combinedProvider.getMessages(
        { sec: 100, nsec: 0 },
        { sec: 150, nsec: 0 },
        { parsedMessages: ["/some_topic", "/some_topic2"] }
      );
      expect(messages.parsedMessages?.length).toEqual(2);
      expect(p1.getMessages.mock.calls[0]).toEqual([
        { sec: 100, nsec: 0 },
        { sec: 130, nsec: 0 },
        { parsedMessages: ["/some_topic"] },
      ]);
      expect(p2.getMessages.mock.calls.length).toEqual(0);
    });

    it("merges messages of various types", async () => {
      const combinedProvider = getCombinedDataProvider([
        { provider: provider1(), prefix: "/p1" },
        { provider: provider4(), prefix: "/p4_1" },
        { provider: provider4(), prefix: "/p4_2" },
      ]);
      const result = await combinedProvider.initialize(mockExtensionPoint().extensionPoint);
      // Sanity check:
      expect(result.start).toEqual({ sec: 101, nsec: 0 });
      expect(result.end).toEqual({ sec: 103, nsec: 0 });
      const messages = await combinedProvider.getMessages(
        { sec: 100, nsec: 0 },
        { sec: 150, nsec: 0 },
        {
          bobjects: ["/p4_1/bobject", "/p4_2/bobject"],
          parsedMessages: ["/p1/some_topic1", "/p4_1/parsed", "/p4_2/parsed"],
          rosBinaryMessages: ["/p4_1/rosbinary", "/p4_2/rosbinary"],
        }
      );
      expect(messages).toEqual({
        bobjects: [
          expect.objectContaining({ topic: "/p4_1/bobject", receiveTime: { sec: 102, nsec: 0 } }),
          expect.objectContaining({ topic: "/p4_2/bobject", receiveTime: { sec: 102, nsec: 0 } }),
        ],
        parsedMessages: [
          expect.objectContaining({ topic: "/p1/some_topic1", receiveTime: { sec: 101, nsec: 0 } }),
          expect.objectContaining({ topic: "/p4_1/parsed", receiveTime: { sec: 102, nsec: 0 } }),
          expect.objectContaining({ topic: "/p4_2/parsed", receiveTime: { sec: 102, nsec: 0 } }),
          expect.objectContaining({ topic: "/p1/some_topic1", receiveTime: { sec: 103, nsec: 0 } }),
        ],
        rosBinaryMessages: [
          expect.objectContaining({ topic: "/p4_1/rosbinary", receiveTime: { sec: 102, nsec: 0 } }),
          expect.objectContaining({ topic: "/p4_2/rosbinary", receiveTime: { sec: 102, nsec: 0 } }),
        ],
      });
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
        combinedProvider.getMessages({ sec: 0, nsec: 0 }, { sec: 0.1, nsec: 0 }, { parsedMessages: ["/some_topic2"] });
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
    Object.defineProperty(lhs, "messagesByTopic", { get: lhsMessagesByTopic });

    const rhs = { sizeInBytes: 2, messagesByTopic: {} };
    const rhsMessagesByTopic = jest.fn().mockReturnValue({ bar: [] });
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
