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

import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import RenameDataProvider from "webviz-core/src/dataProviders/RenameDataProvider";
import { wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";

// reusable providers
function getProvider() {
  const messages = {
    parsedMessages: [
      { topic: "/some_topic1", receiveTime: { sec: 101, nsec: 0 }, message: { value: 1 } },
      { topic: "/some_topic1", receiveTime: { sec: 103, nsec: 0 }, message: { value: 3 } },
    ],
    rosBinaryMessages: undefined,
    bobjects: undefined,
  };
  return new MemoryDataProvider({
    messages,
    topics: [{ name: "/some_topic1", datatype: "some_datatype" }],
    providesParsedMessages: true,
    messageDefinitionsByTopic: { "/some_topic1": "int32 value" },
  });
}

function getRenameDataProvider(provider, topicMapping) {
  // $FlowFixMe: This is not how the getProvider callback is meant to work.
  return new RenameDataProvider({ topicMapping }, [provider], (child) => child);
}

const topicMappingForPrefix = (prefix: string) => ({ [prefix]: { excludeTopics: [] } });

describe("RenameDataProvider", () => {
  describe("error handling", () => {
    it("throws if a prefix does not have a leading forward slash", () => {
      expect(() => getRenameDataProvider(getProvider(), topicMappingForPrefix("foo"))).toThrow();
    });
  });

  describe("features", () => {
    it("renames initialization data", async () => {
      const provider = getRenameDataProvider(getProvider(), topicMappingForPrefix($WEBVIZ_SOURCE_2));
      expect(await provider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
        start: { nsec: 0, sec: 101 },
        end: { nsec: 0, sec: 103 },
        topics: [{ datatype: "some_datatype", name: `${$WEBVIZ_SOURCE_2}/some_topic1`, originalTopic: "/some_topic1" }],
        messageDefinitions: {
          type: "raw",
          messageDefinitionsByTopic: { [`${$WEBVIZ_SOURCE_2}/some_topic1`]: "int32 value" },
        },
        numMessages: undefined,
        providesParsedMessages: true,
      });
    });

    it("renames initialization data - parsed message definitions", async () => {
      const baseProvider = getProvider();
      baseProvider.parsedMessageDefinitionsByTopic = { "/some_topic1": [] };
      const provider = getRenameDataProvider(baseProvider, topicMappingForPrefix($WEBVIZ_SOURCE_2));
      expect(await provider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
        start: { nsec: 0, sec: 101 },
        end: { nsec: 0, sec: 103 },
        topics: [{ datatype: "some_datatype", name: `${$WEBVIZ_SOURCE_2}/some_topic1`, originalTopic: "/some_topic1" }],
        messageDefinitions: {
          type: "parsed",
          messageDefinitionsByTopic: { [`${$WEBVIZ_SOURCE_2}/some_topic1`]: "int32 value" },
          datatypes: {},
          parsedMessageDefinitionsByTopic: { [`${$WEBVIZ_SOURCE_2}/some_topic1`]: [] },
        },
        numMessages: undefined,
        providesParsedMessages: true,
      });
    });

    it("adds the prefix to streamed message topics", async () => {
      const provider = getRenameDataProvider(getProvider(), topicMappingForPrefix($WEBVIZ_SOURCE_2));
      await provider.initialize(mockExtensionPoint().extensionPoint);
      const result = await provider.getMessages(
        { sec: 101, nsec: 0 },
        { sec: 103, nsec: 0 },
        { parsedMessages: [`${$WEBVIZ_SOURCE_2}/some_topic1`] }
      );
      expect(result.bobjects).toBe(undefined);
      expect(result.rosBinaryMessages).toBe(undefined);
      expect(result.parsedMessages).toEqual([
        { message: { value: 1 }, receiveTime: { nsec: 0, sec: 101 }, topic: `${$WEBVIZ_SOURCE_2}/some_topic1` },
        { message: { value: 3 }, receiveTime: { nsec: 0, sec: 103 }, topic: `${$WEBVIZ_SOURCE_2}/some_topic1` },
      ]);
    });

    it("handles more complex topping mappings", async () => {
      const topicsForTopicMapping = async (topicMapping) => {
        const provider = getRenameDataProvider(getProvider(), topicMapping);
        const result = await provider.initialize(mockExtensionPoint().extensionPoint);
        return result.topics.map(({ name }) => name);
      };

      const alwaysPrefixMapping = {
        "": { excludeTopics: ["/some_topic1"] },
        "/prefix": { excludeTopics: ["/other_topic"] },
      };
      expect(await topicsForTopicMapping(alwaysPrefixMapping)).toEqual(["/prefix/some_topic1"]);
      const neverPrefixMapping = {
        "": { excludeTopics: ["/other_topic"] },
        "/prefix": { excludeTopics: ["/some_topic1"] },
      };
      expect(await topicsForTopicMapping(neverPrefixMapping)).toEqual(["/some_topic1"]);
      const ambiguousPrefixMapping = {
        "": { excludeTopics: [] },
        "/prefix": { excludeTopics: [] },
      };
      // Map child topic to two parent topics: One for each prefix.
      expect(await topicsForTopicMapping(ambiguousPrefixMapping)).toEqual(["/some_topic1", "/prefix/some_topic1"]);
    });
  });

  describe("extensionPoint", () => {
    describe("progressCallback", () => {
      it("calls progressCallback with the progress data passed from child provider", async () => {
        const provider = getProvider();
        const combinedProvider = getRenameDataProvider(provider, topicMappingForPrefix("/generic_topic"));
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);
        provider.extensionPoint.progressCallback({
          fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }],
          messageCache: {
            startTime: { sec: 100, nsec: 0 },
            blocks: [
              undefined,
              {
                sizeInBytes: 99,
                messagesByTopic: {
                  "/some_topic1": [
                    {
                      topic: "/some_topic1",
                      receiveTime: { sec: 101, nsec: 0 },
                      message: wrapJsObject({}, "time", { sec: 0, nsec: 0 }),
                    },
                  ],
                },
              },
            ],
          },
        });
        const calls = mockProgressCallback.mock.calls;
        expect(calls[calls.length - 1]).toEqual([
          {
            fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }],
            messageCache: {
              startTime: { sec: 100, nsec: 0 },
              blocks: [
                undefined,
                {
                  sizeInBytes: 99,
                  messagesByTopic: {
                    "/generic_topic/some_topic1": [
                      expect.objectContaining({
                        receiveTime: { sec: 101, nsec: 0 },
                        topic: "/generic_topic/some_topic1",
                      }),
                    ],
                  },
                },
              ],
            },
          },
        ]);
      });

      it("preserves block identity across successive calls", async () => {
        const provider = getProvider();
        const combinedProvider = getRenameDataProvider(provider, topicMappingForPrefix("/generic_topic"));
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);

        const blocks = [{ sizeInBytes: 99, messagesByTopic: { "/some_topic1": [] } }];
        provider.extensionPoint.progressCallback({
          fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }],
          messageCache: { startTime: { sec: 100, nsec: 0 }, blocks },
        });
        provider.extensionPoint.progressCallback({
          fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }],
          messageCache: { startTime: { sec: 100, nsec: 0 }, blocks },
        });

        const calls = mockProgressCallback.mock.calls;
        expect(calls.length).toBe(3); // once on init, once per call.
        const cache1 = calls[1][0].messageCache;
        const blocks1 = cache1.blocks;
        const cache2 = calls[2][0].messageCache;
        const blocks2 = cache2.blocks;
        expect(cache1).not.toBe(cache2);
        expect(cache1).toEqual(cache2);
        expect(blocks1).not.toBe(blocks2);
        expect(blocks1[0]).toBe(blocks2[0]);
      });

      it("can preserve cache identity across successive calls", async () => {
        const provider = getProvider();
        const combinedProvider = getRenameDataProvider(provider, topicMappingForPrefix("/generic_topic"));
        const extensionPoint = mockExtensionPoint().extensionPoint;
        const mockProgressCallback = jest.spyOn(extensionPoint, "progressCallback");
        await combinedProvider.initialize(extensionPoint);

        const messageCache = {
          startTime: { sec: 100, nsec: 0 },
          blocks: [{ sizeInBytes: 99, messagesByTopic: { "/some_topic1": [] } }],
        };
        provider.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }], messageCache });
        provider.extensionPoint.progressCallback({ fullyLoadedFractionRanges: [{ start: 0, end: 0.5 }], messageCache });

        const calls = mockProgressCallback.mock.calls;
        expect(calls.length).toBe(3); // once on init, once per call.
        const cache1 = calls[1][0].messageCache;
        const cache2 = calls[2][0].messageCache;
        expect(cache1).toBe(cache2);
      });
    });
  });
});
