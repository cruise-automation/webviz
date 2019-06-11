// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import microMemoize from "micro-memoize";

import type { Topic } from "webviz-core/src/types/players";

export const getFilteredFormattedTopics: (topics: Topic[], currentTopicPrefix: string) => Topic[] = microMemoize(
  (topics: Topic[], currentTopicPrefix: string): Topic[] => {
    const filteredTopics = topics.filter((topic) => topic.name.startsWith(currentTopicPrefix));
    return filteredTopics.map((topic) => ({
      ...topic,
      name: topic.name.slice(currentTopicPrefix.length),
    }));
  },
  { maxSize: 10 }
);

export const getMessagesWithoutPrefixByTopic = (topicPrefix: string) => {
  // memoized transformedMessagesByTopic stores all topics and their corresponding messages
  // with all topic names stripped of the current topicPrefix
  const transformedMessagesByTopic = {};
  return microMemoize(({ messagesByTopic, ...otherData }) => {
    const messagesByTopicWithoutTopicPrefix = {};
    // check every topic coming in via the new messagesByTopic object
    for (const topic in messagesByTopic) {
      // if topic starts with the current topicPrefix,
      if (topic.startsWith(topicPrefix)) {
        transformedMessagesByTopic[topic] = transformedMessagesByTopic[topic] || new Map();
        // remove topicPrefix, and use this prefix-less topic as a key in transformedMessagesByTopic object
        // that points to that topic's corresponding messages as the value (all of which now reference a prefix-less topic)
        messagesByTopicWithoutTopicPrefix[topic.slice(topicPrefix.length)] = messagesByTopic[topic].map((message) => {
          if (!transformedMessagesByTopic[topic].has(message)) {
            transformedMessagesByTopic[topic].set(message, {
              ...message,
              topic: message.topic.slice(topicPrefix.length),
            });
          }
          return transformedMessagesByTopic[topic].get(message);
        });
        // clear out any messages in memoized transformedMessagesByTopic not in messagesByTopic, as they are outdated
        for (const message of transformedMessagesByTopic[topic].keys()) {
          if (!messagesByTopic[topic].includes(message)) {
            transformedMessagesByTopic[topic].delete(message);
          }
        }
        // if topic does not start with the current topicPrefix, ignore its messages
        // (i.e. set topic as key, but empty array as value, in transformedMessagesByTopic)
      } else {
        messagesByTopicWithoutTopicPrefix[topic] = [];
      }
    }
    // clear out any topics in memoized transformedMessagesByTopic not in messagesByTopic, as they are outdated
    for (const topic in transformedMessagesByTopic) {
      if (!messagesByTopic[topic]) {
        delete transformedMessagesByTopic[topic];
      }
    }
    return { messagesByTopic: messagesByTopicWithoutTopicPrefix, ...otherData };
  });
};
