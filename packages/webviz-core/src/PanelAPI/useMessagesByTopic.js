// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { groupBy } from "lodash";
import { useCallback } from "react";

import { useMessageReducer } from "./useMessageReducer";
import type { Message, TypedMessage, MessageFormat } from "webviz-core/src/players/types";
import { useDeepMemo } from "webviz-core/src/util/hooks";

// Exported for tests
// Equivalent to array1.concat(array2).slice(-limit), but somewhat faster. Also works with limit=0.
export const concatAndTruncate = <T>(array1: $ReadOnlyArray<T>, array2: $ReadOnlyArray<T>, limit: number): T[] => {
  const toTakeFromArray1 = limit - array2.length;
  const ret = toTakeFromArray1 <= 0 ? [] : array1.slice(-toTakeFromArray1);
  const toTakeFromArray2 = limit - ret.length;
  for (let i = Math.max(0, array2.length - toTakeFromArray2); i < array2.length; ++i) {
    ret.push(array2[i]);
  }
  return ret;
};

export type MessagesByTopic = $ReadOnly<{ [topic: string]: $ReadOnlyArray<Message> }>;

// Convenience wrapper around `useMessageReducer`, for if you just want some
// recent messages for a few topics.
export function useMessagesByTopic<T: any>({
  topics,
  historySize,
  preloadingFallback,
  format = "parsedMessages",
}: {
  topics: $ReadOnlyArray<string>,
  historySize: number,
  preloadingFallback?: ?boolean,
  format?: MessageFormat,
}): MessagesByTopic {
  const requestedTopics = useDeepMemo(topics);

  const addMessages: (
    $ReadOnly<{ [string]: $ReadOnlyArray<TypedMessage<T>> }>,
    $ReadOnlyArray<TypedMessage<T>>
  ) => $ReadOnly<{ [string]: $ReadOnlyArray<TypedMessage<T>> }> = useCallback((
    prevMessagesByTopic: $ReadOnly<{ [string]: $ReadOnlyArray<TypedMessage<T>> }>,
    messages: $ReadOnlyArray<TypedMessage<T>>
  ) => {
    const newMessagesByTopic = groupBy(messages, "topic");
    const ret = { ...prevMessagesByTopic };
    Object.keys(newMessagesByTopic).forEach((topic) => {
      ret[topic] = concatAndTruncate(ret[topic], newMessagesByTopic[topic], historySize);
    });
    return ret;
  }, [historySize]);

  const restore = useCallback((
    prevMessagesByTopic: ?$ReadOnly<{ [string]: $ReadOnlyArray<TypedMessage<T>> }>
  ): $ReadOnly<{ [string]: $ReadOnlyArray<TypedMessage<T>> }> => {
    const newMessagesByTopic: { [topic: string]: TypedMessage<T>[] } = {};
    // When changing topics, we try to keep as many messages around from the previous set of
    // topics as possible.
    for (const topic of requestedTopics) {
      newMessagesByTopic[topic] =
        prevMessagesByTopic && prevMessagesByTopic[topic] ? prevMessagesByTopic[topic].slice(-historySize) : [];
    }
    return newMessagesByTopic;
  }, [requestedTopics, historySize]);

  return useMessageReducer({
    topics: requestedTopics,
    restore,
    preloadingFallback,
    ...(format === "bobjects" ? { addBobjects: addMessages } : { addMessages }),
  });
}
