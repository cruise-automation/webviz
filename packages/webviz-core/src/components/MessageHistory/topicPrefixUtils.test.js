// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { getFilteredFormattedTopics, getMessagesWithoutPrefixByTopic } from "./topicPrefixUtils";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

const datatype = "/some/datatype";

const topic = "/some/topic";
const anotherTopic = "/another/topic/";

const topicSecondBag = `${SECOND_BAG_PREFIX}${topic}`;
const anotherTopicSecondBag = `${SECOND_BAG_PREFIX}${anotherTopic}`;

const msg = { topic, message: { someKey: "someVal" } };
const msgSecondBag = { ...msg, topic: topicSecondBag, message: { someKey: "someValSecond" } };

const anotherMsg = { topic, someKey: "anotherVal", message: { someKey: "anotherVal" } };
const anotherMsgSecondBag = { ...anotherMsg, topic: topicSecondBag, message: { someKey: "anotherValSecond" } };

describe("topicPrefixUtils", () => {
  describe("getFilteredFormattedTopics", () => {
    it("gets filtered formatted topics if there is no topic prefix", () => {
      const filteredFormattedTopics = getFilteredFormattedTopics(
        [topicSecondBag, anotherTopicSecondBag].map((topicName) => ({ name: topicName, datatype })),
        ""
      );
      expect(filteredFormattedTopics.map((topic) => topic.name)).toEqual([topicSecondBag, anotherTopicSecondBag]);
    });

    it("gets filtered formatted topics if there is a topic prefix", () => {
      const filteredFormattedTopics = getFilteredFormattedTopics(
        [topicSecondBag, anotherTopicSecondBag].map((topicName) => ({ name: topicName, datatype })),
        SECOND_BAG_PREFIX
      );
      expect(filteredFormattedTopics.map((topic) => topic.name)).toEqual([topic, anotherTopic]);
    });
  });

  describe("getMessageWithoutPrefixByTopic", () => {
    it("returns same messages if there is no topic prefix", () => {
      const exampleData = {
        messagesByTopic: {
          [topic]: [msg],
          [anotherTopic]: [{ ...anotherMsg, topic: anotherTopic }],
          [topicSecondBag]: [msgSecondBag],
          [anotherTopicSecondBag]: [{ ...anotherMsgSecondBag, topic: anotherTopicSecondBag }],
        },
      };
      const messages = getMessagesWithoutPrefixByTopic("")(exampleData);
      expect(messages).toEqual(exampleData);
    });

    it("returns corresponding messages if there is a topic prefix", () => {
      const messages = getMessagesWithoutPrefixByTopic(SECOND_BAG_PREFIX)({
        messagesByTopic: {
          [topic]: [msg],
          [anotherTopic]: [{ ...anotherMsg, topic: anotherTopic }],
          [topicSecondBag]: [msgSecondBag],
          [anotherTopicSecondBag]: [{ ...anotherMsgSecondBag, topic: anotherTopicSecondBag }],
        },
      });
      expect(messages.messagesByTopic).toEqual({
        [topic]: [msgSecondBag].map((msg) => ({ ...msg, topic })),
        [anotherTopic]: [anotherMsgSecondBag].map((msg) => ({ ...msg, topic: anotherTopic })),
      });
    });

    it("remembers previously seen messages when included in new array of messages", () => {
      const getAllMessages = getMessagesWithoutPrefixByTopic("");
      const firstMsgs = getAllMessages({ messagesByTopic: { [topic]: [msg] } });
      const secondMsgs = getAllMessages({ messagesByTopic: { [topic]: [msg, anotherMsg] } });

      expect(secondMsgs.messagesByTopic[topic][0]).toBe(firstMsgs.messagesByTopic[topic][0]);
    });

    it("remembers previously seen messages when included in new array of messages – with topic prefix", () => {
      const getAllMessages = getMessagesWithoutPrefixByTopic(SECOND_BAG_PREFIX);
      const firstMsgs = getAllMessages({ messagesByTopic: { [topic]: [msg], [topicSecondBag]: [msgSecondBag] } });
      const secondMsgs = getAllMessages({
        messagesByTopic: { [topic]: [msg, anotherMsg], [topicSecondBag]: [msgSecondBag, anotherMsgSecondBag] },
      });

      expect(firstMsgs.messagesByTopic[topic]).toEqual([{ ...msgSecondBag, topic }]);
      expect(secondMsgs.messagesByTopic[topic]).toEqual([
        { ...msgSecondBag, topic },
        { ...anotherMsgSecondBag, topic },
      ]);
      expect(secondMsgs.messagesByTopic[topic][0]).toBe(firstMsgs.messagesByTopic[topic][0]);
    });

    it("forgets previously seen messages when not included in new array of messages", () => {
      const getAllMessages = getMessagesWithoutPrefixByTopic("");
      const firstMsgs = getAllMessages({ messagesByTopic: { [topic]: [msg] } });
      getAllMessages({ messagesByTopic: { [topic]: [anotherMsg] } });
      const thirdMsgs = getAllMessages({ messagesByTopic: { [topic]: [msg] } });

      expect(thirdMsgs.messagesByTopic[topic][0]).not.toBe(firstMsgs.messagesByTopic[topic][0]);
    });

    it("forgets previously seen messages when not included in new array of messages – with topic prefix", () => {
      const getAllMessages = getMessagesWithoutPrefixByTopic(SECOND_BAG_PREFIX);
      const firstMsgs = getAllMessages({ messagesByTopic: { [topic]: [msg], [topicSecondBag]: [msgSecondBag] } });
      getAllMessages({
        messagesByTopic: { [topic]: [anotherMsg], [topicSecondBag]: [anotherMsgSecondBag] },
      });
      const thirdMsgs = getAllMessages({ messagesByTopic: { [topic]: [msg], [topicSecondBag]: [msgSecondBag] } });

      expect(thirdMsgs.messagesByTopic[topic][0]).not.toBe(firstMsgs.messagesByTopic[topic][0]);
    });

    it("forgets previously seen topics when they are not included in new messagesByTopic", () => {
      const getAllMessages = getMessagesWithoutPrefixByTopic("");
      const firstMsgs = getAllMessages({ messagesByTopic: { [topicSecondBag]: [msgSecondBag] } });
      getAllMessages({ messagesByTopic: { [topic]: [msg, anotherMsg] } });
      const thirdMsgs = getAllMessages({ messagesByTopic: { [topicSecondBag]: [msgSecondBag] } });

      expect(thirdMsgs.messagesByTopic[topicSecondBag][0]).toEqual(firstMsgs.messagesByTopic[topicSecondBag][0]);
      expect(thirdMsgs.messagesByTopic[topicSecondBag][0]).not.toBe(firstMsgs.messagesByTopic[topicSecondBag][0]);
    });

    it("forgets previously seen topics when they are not included in new messagesByTopic – with topic prefix", () => {
      const getAllMessages = getMessagesWithoutPrefixByTopic(SECOND_BAG_PREFIX);
      const messages = { [topic]: [msg], [topicSecondBag]: [msgSecondBag] };
      const otherMessages = {
        [anotherTopic]: [{ anotherMsg, topic: anotherTopic }],
        [anotherTopicSecondBag]: [{ ...anotherMsgSecondBag, topic: anotherTopicSecondBag }],
      };

      const firstMsgs = getAllMessages({ messagesByTopic: messages });
      getAllMessages({ messagesByTopic: otherMessages });
      const thirdMsgs = getAllMessages({ messagesByTopic: messages });

      expect(thirdMsgs.messagesByTopic[topic][0]).toEqual(firstMsgs.messagesByTopic[topic][0]);
      expect(thirdMsgs.messagesByTopic[topic][0]).not.toBe(firstMsgs.messagesByTopic[topic][0]);
    });

    it("is memoized so that calling with same arguments will return same object", () => {
      const getAllMessages = getMessagesWithoutPrefixByTopic("");
      const exampleData = { messagesByTopic: { [topic]: [msg] } };

      expect(getAllMessages(exampleData)).toBe(getAllMessages(exampleData));
    });

    it("is memoized so that calling with same arguments will return same object - with topic prefix", () => {
      const getAllMessages = getMessagesWithoutPrefixByTopic(SECOND_BAG_PREFIX);
      const exampleData = { messagesByTopic: { [topic]: [msg] } };

      expect(getAllMessages(exampleData)).toBe(getAllMessages(exampleData));
    });
  });
});
