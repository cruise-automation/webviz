// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import microMemoize from "micro-memoize";

import type { Topic, Message } from "webviz-core/src/types/players";

let lastMessages;
let memoizedGetMessagesForTopicPrefix;
export function getMessagesWithoutPrefix(messages: Message[], topicPrefix: string): Message[] {
  if (messages !== lastMessages) {
    lastMessages = messages;
    memoizedGetMessagesForTopicPrefix = microMemoize(
      (topicPrefix: string) => {
        const filteredMsgs = messages.filter((msg) => msg.topic.startsWith(topicPrefix));
        return filteredMsgs.map((msg) => ({
          ...msg,
          topic: msg.topic.slice(topicPrefix.length),
        }));
      },
      { maxSize: 10 }
    );
  }
  return memoizedGetMessagesForTopicPrefix(topicPrefix);
}

const unMemoizedGetFilteredFormattedTopics = (topics: Topic[], currentTopicPrefix: string): Topic[] => {
  const filteredTopics = topics.filter((topic) => topic.name.includes(currentTopicPrefix));
  return filteredTopics.map((topic) => ({
    ...topic,
    name: topic.name.slice(currentTopicPrefix.length),
  }));
};

export const getFilteredFormattedTopics: (topics: Topic[], currentTopicPrefix: string) => Topic[] = microMemoize(
  unMemoizedGetFilteredFormattedTopics,
  { maxSize: 10 }
);
