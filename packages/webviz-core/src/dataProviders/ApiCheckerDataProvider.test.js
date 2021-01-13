// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ApiCheckerDataProvider from "webviz-core/src/dataProviders/ApiCheckerDataProvider";
import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import sendNotification from "webviz-core/src/util/sendNotification";

function getProvider(isRoot: boolean = false) {
  const memoryDataProvider = new MemoryDataProvider({
    messages: {
      parsedMessages: [
        { topic: "/some_topic", receiveTime: { sec: 100, nsec: 0 }, message: 0 },
        { topic: "/some_topic", receiveTime: { sec: 105, nsec: 0 }, message: 1 },
      ],
      bobjects: undefined,
      rosBinaryMessages: undefined,
    },
    topics: [
      { name: "/some_topic", datatype: "some_datatype" },
      { name: "/some_other_topic", datatype: "some_datatype" },
    ],
    datatypes: { some_datatype: { fields: [] } },
    messageDefinitionsByTopic: { "/some_other_topic": "dummy" },
    parsedMessageDefinitionsByTopic: { "/some_topic": [], "/some_other_topic": [] },
    providesParsedMessages: false, // to test missing messageDefinitionsByTopic
  });

  return {
    provider: new ApiCheckerDataProvider(
      { name: "test@1", isRoot },
      [{ name: "MemoryDataProvider", args: {}, children: [] }],
      () => memoryDataProvider
    ),
    memoryDataProvider,
  };
}

describe("ApiCheckerDataProvider", () => {
  describe("#initialize", () => {
    it("works in the normal case", async () => {
      const { provider } = getProvider(true);
      const initializationResult = await provider.initialize(mockExtensionPoint().extensionPoint);
      expect(initializationResult).toEqual({
        messageDefinitions: {
          type: "parsed",
          // with parsed messageDefintions, the string messageDefintionsByTopic does not need to be complete.
          messageDefinitionsByTopic: { "/some_other_topic": "dummy" },
          parsedMessageDefinitionsByTopic: { "/some_topic": [], "/some_other_topic": [] },
          datatypes: { some_datatype: { fields: [] } },
        },
        end: { nsec: 0, sec: 105 },
        start: { nsec: 0, sec: 100 },
        topics: [
          { datatype: "some_datatype", name: "/some_topic" },
          { datatype: "some_datatype", name: "/some_other_topic" },
        ],
        providesParsedMessages: false,
      });
    });

    it("works with unparsed message defintions", async () => {
      const { provider, memoryDataProvider } = getProvider();
      memoryDataProvider.messageDefinitionsByTopic = { "/some_topic": "dummy", "/some_other_topic": "dummy" };
      memoryDataProvider.parsedMessageDefinitionsByTopic = undefined;
      memoryDataProvider.datatypes = undefined;
      const initializationResult = await provider.initialize(mockExtensionPoint().extensionPoint);
      expect(initializationResult).toEqual({
        messageDefinitions: {
          type: "raw",
          messageDefinitionsByTopic: { "/some_topic": "dummy", "/some_other_topic": "dummy" },
        },
        end: { nsec: 0, sec: 105 },
        start: { nsec: 0, sec: 100 },
        topics: [
          { datatype: "some_datatype", name: "/some_topic" },
          { datatype: "some_datatype", name: "/some_other_topic" },
        ],
        providesParsedMessages: false,
      });
    });

    describe("failure", () => {
      afterEach(() => {
        sendNotification.expectCalledDuringTest();
      });

      it("throws when calling twice", async () => {
        const { provider } = getProvider();
        await provider.initialize(mockExtensionPoint().extensionPoint);
        await expect(provider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
      });

      it("throws when there are no topics", async () => {
        const { provider, memoryDataProvider } = getProvider();
        memoryDataProvider.topics = [];
        await expect(provider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
      });

      it("throws when topic datatype is missing", async () => {
        const { provider, memoryDataProvider } = getProvider();
        memoryDataProvider.datatypes = { some_other_datatype: { fields: [] } };
        await expect(provider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
      });

      it("throws when topic is missing from parsedMessageDefinitionsByTopic", async () => {
        const { provider, memoryDataProvider } = getProvider();
        memoryDataProvider.parsedMessageDefinitionsByTopic = {
          "/some_other_topic": [],
        };
        await expect(provider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
      });

      it("throws when topic is missing from messageDefinitionsByTopic (raw messageDefinitions)", async () => {
        const { provider, memoryDataProvider } = getProvider(true);
        memoryDataProvider.parsedMessageDefinitionsByTopic = undefined;
        memoryDataProvider.datatypes = undefined;
        await expect(provider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
      });

      it("throws when root message definitions are not parsed", async () => {
        const { provider, memoryDataProvider } = getProvider(true);
        memoryDataProvider.messageDefinitionsByTopic = { "/some_topic": "dummy", "/some_other_topic": "dummy" };
        memoryDataProvider.parsedMessageDefinitionsByTopic = undefined;
        memoryDataProvider.datatypes = undefined;
        await expect(provider.initialize(mockExtensionPoint().extensionPoint)).rejects.toThrow();
      });
    });
  });

  describe("#getMessages", () => {
    it("works in the normal case", async () => {
      const { provider } = getProvider();
      await provider.initialize(mockExtensionPoint().extensionPoint);
      const result = await provider.getMessages(
        { sec: 100, nsec: 0 },
        { sec: 105, nsec: 0 },
        { parsedMessages: ["/some_topic"] }
      );
      expect(result.bobjects).toBe(undefined);
      expect(result.rosBinaryMessages).toBe(undefined);
      expect(result.parsedMessages).toEqual([
        { message: 0, receiveTime: { nsec: 0, sec: 100 }, topic: "/some_topic" },
        { message: 1, receiveTime: { nsec: 0, sec: 105 }, topic: "/some_topic" },
      ]);
    });

    describe("failure", () => {
      afterEach(() => {
        sendNotification.expectCalledDuringTest();
      });
      it("throws when calling getMessages before initialize", async () => {
        const { provider } = getProvider();
        await expect(
          provider.getMessages({ sec: 100, nsec: 0 }, { sec: 105, nsec: 0 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();
      });

      it("throws when calling getMessages start/end time that contains non-integer values", async () => {
        const { provider } = getProvider();
        await provider.initialize(mockExtensionPoint().extensionPoint);
        await expect(
          provider.getMessages({ sec: 100, nsec: 0 }, { sec: 105, nsec: 0.1 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();
        await expect(
          provider.getMessages({ sec: 100.5, nsec: 0 }, { sec: 105, nsec: 0 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();
      });

      it("throws when calling getMessages with invalid ranges", async () => {
        const { provider } = getProvider();
        await provider.initialize(mockExtensionPoint().extensionPoint);
        await expect(
          provider.getMessages({ sec: 90, nsec: 0 }, { sec: 95, nsec: 0 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();
        await expect(
          provider.getMessages({ sec: 110, nsec: 0 }, { sec: 115, nsec: 0 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();
        await expect(
          provider.getMessages({ sec: 105, nsec: 0 }, { sec: 100, nsec: 0 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();
      });

      it("throws when calling getMessages with invalid topics", async () => {
        const { provider } = getProvider();
        await provider.initialize(mockExtensionPoint().extensionPoint);
        await expect(
          provider.getMessages({ sec: 100, nsec: 0 }, { sec: 105, nsec: 0 }, { parsedMessages: [] })
        ).rejects.toThrow();
        await expect(
          provider.getMessages({ sec: 100, nsec: 0 }, { sec: 105, nsec: 0 }, { parsedMessages: ["/invalid_topic"] })
        ).rejects.toThrow();
      });

      it("throws when getMessages returns invalid messages", async () => {
        const { provider, memoryDataProvider } = getProvider();
        await provider.initialize(mockExtensionPoint().extensionPoint);

        let returnMessages = [];
        jest.spyOn(memoryDataProvider, "getMessages").mockImplementation(() => ({
          parsedMessages: returnMessages,
          bobjects: undefined,
          rosBinaryMessages: undefined,
        }));

        // Return messages that are still within the global range, but outside of the requested range.
        returnMessages = [{ topic: "/some_topic", receiveTime: { sec: 100, nsec: 0 }, message: 0 }];
        await expect(
          provider.getMessages({ sec: 102, nsec: 0 }, { sec: 103, nsec: 0 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();

        returnMessages = [{ topic: "/some_topic", receiveTime: { sec: 104, nsec: 0 }, message: 0 }];
        await expect(
          provider.getMessages({ sec: 102, nsec: 0 }, { sec: 103, nsec: 0 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();

        // Incorrect order.
        returnMessages = [
          { topic: "/some_topic", receiveTime: { sec: 105, nsec: 0 }, message: 1 },
          { topic: "/some_topic", receiveTime: { sec: 100, nsec: 0 }, message: 0 },
        ];
        await expect(
          provider.getMessages({ sec: 100, nsec: 0 }, { sec: 105, nsec: 0 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();

        // Valid topic, but not requested
        returnMessages = [{ topic: "/some_other_topic", receiveTime: { sec: 100, nsec: 0 }, message: 0 }];
        await expect(
          provider.getMessages({ sec: 100, nsec: 0 }, { sec: 105, nsec: 0 }, { parsedMessages: ["/some_topic"] })
        ).rejects.toThrow();
      });
    });
  });

  describe("#close", () => {
    it("works in the normal case", async () => {
      const { provider } = getProvider();
      await provider.initialize(mockExtensionPoint().extensionPoint);
      expect(await provider.close()).toEqual(undefined);
    });

    describe("failure", () => {
      afterEach(() => {
        sendNotification.expectCalledDuringTest();
      });
      it("throws when calling close before initialize", async () => {
        const { provider } = getProvider();
        await expect(provider.close()).rejects.toThrow();
      });

      it("throws when calling twice", async () => {
        const { provider } = getProvider();
        await provider.initialize(mockExtensionPoint().extensionPoint);
        await provider.close();
        await expect(provider.close()).rejects.toThrow();
      });
    });
  });
});
