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
    topics: [{ name: "/some_topic1", datatypeName: "some_datatype", datatypeId: "some_datatype" }],
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
        topics: [
          {
            datatypeName: "some_datatype",
            datatypeId: "some_datatype",
            name: `${$WEBVIZ_SOURCE_2}/some_topic1`,
            originalTopic: "/some_topic1",
          },
        ],
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
        topics: [
          {
            datatypeName: "some_datatype",
            datatypeId: "some_datatype",
            name: `${$WEBVIZ_SOURCE_2}/some_topic1`,
            originalTopic: "/some_topic1",
          },
        ],
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

    it("handles topping mappings where a child topic is fully suppressed", async () => {
      const topicMapping = { "": { excludeTopics: ["/some_topic1"] } };
      const provider = getRenameDataProvider(getProvider(), topicMapping);
      const result = await provider.initialize(mockExtensionPoint().extensionPoint);
      expect(result.topics).toEqual([]);
    });
  });
});
