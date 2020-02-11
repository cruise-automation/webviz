// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { useCallback } from "react";

import { useMessageReducer } from "./useMessageReducer";
import type { Message } from "webviz-core/src/players/types";
import { useDeepMemo } from "webviz-core/src/util/hooks";

// Convenience wrapper around `useMessageReducer`, for if you just want some
// recent messages for a few topics.
export function useMessagesByTopic({
  topics,
  historySize,
}: {
  topics: $ReadOnlyArray<string>,
  historySize: number,
}): { [topic: string]: Message[] } {
  const requestedTopics = useDeepMemo(topics);

  const addMessage: ({ [string]: Message[] }, Message) => { [string]: Message[] } = useCallback(
    (prevMessagesByTopic: { [string]: Message[] }, message: Message) => ({
      ...prevMessagesByTopic,
      [message.topic]: prevMessagesByTopic[message.topic].concat(message).slice(-historySize),
    }),
    [historySize]
  );

  const restore = useCallback(
    (prevMessagesByTopic: ?{ [string]: Message[] }): { [string]: Message[] } => {
      const newMessagesByTopic: { [topic: string]: Message[] } = {};
      // When changing topics, we try to keep as many messages around from the previous set of
      // topics as possible.
      for (const topic of requestedTopics) {
        newMessagesByTopic[topic] =
          prevMessagesByTopic && prevMessagesByTopic[topic] ? prevMessagesByTopic[topic].slice(-historySize) : [];
      }
      return newMessagesByTopic;
    },
    [requestedTopics, historySize]
  );

  return useMessageReducer({ topics: requestedTopics, addMessage, restore });
}
