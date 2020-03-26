// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { useCallback } from "react";

import { useMessageReducer } from "./useMessageReducer";
import type { TypedMessage } from "webviz-core/src/players/types";
import { useDeepMemo } from "webviz-core/src/util/hooks";

// Convenience wrapper around `useMessageReducer`, for if you just want some
// recent messages for a few topics.
export function useMessagesByTopic<T: any>({
  topics,
  historySize,
}: {
  topics: $ReadOnlyArray<string>,
  historySize: number,
}): { [topic: string]: TypedMessage<T>[] } {
  const requestedTopics = useDeepMemo(topics);

  const addMessage: ({ [string]: TypedMessage<T>[] }, TypedMessage<T>) => { [string]: TypedMessage<T>[] } = useCallback(
    (prevMessagesByTopic: { [string]: TypedMessage<T>[] }, message: TypedMessage<T>) => ({
      ...prevMessagesByTopic,
      [message.topic]: prevMessagesByTopic[message.topic].concat(message).slice(-historySize),
    }),
    [historySize]
  );

  const restore = useCallback(
    (prevMessagesByTopic: ?{ [string]: TypedMessage<T>[] }): { [string]: TypedMessage<T>[] } => {
      const newMessagesByTopic: { [topic: string]: TypedMessage<T>[] } = {};
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
