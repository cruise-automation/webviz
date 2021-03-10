// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupBy } from "lodash";
import { useMemo, useCallback } from "react";

import { useBlocksByTopic, type BlocksForTopics as ImportedBlocksForTopics } from "./useBlocksByTopic";
import { useMessageReducer } from "./useMessageReducer";
import { useShallowMemo } from "webviz-core/src/util/hooks";

export type BlocksForTopics = ImportedBlocksForTopics;

// useBlocksByTopic, but falls back if blocks are not available (ex: Websocket).
// Does not yet work with built-in or user node topics, use a different solution if those topics are required.
export default function useBlocksByTopicWithFallback(topics: $ReadOnlyArray<string>): BlocksForTopics {
  const requestedTopics = useShallowMemo(topics);
  const blocks = useBlocksByTopic(requestedTopics);

  const nonPreloadedBlocks =
    useMessageReducer({
      topics: requestedTopics,
      restore: useCallback(() => [], []),
      addBobjects: useCallback((arr, bobjects) => {
        const block = groupBy(bobjects, (bobject) => bobject.topic);
        // Ensure that each topic is represented in the block.
        requestedTopics.forEach((topic) => {
          block[topic] = block[topic] || [];
        });
        return [...arr, block];
      }, [requestedTopics]),
      preloadingFallback: true,
    }) || [];

  return useMemo(() => {
    if (!blocks.length) {
      return nonPreloadedBlocks;
    }
    return blocks;
  }, [blocks, nonPreloadedBlocks]);
}
