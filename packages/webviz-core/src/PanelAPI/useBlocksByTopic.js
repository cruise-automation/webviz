// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import memoizeWeak from "memoize-weak";
import { useCallback, useMemo } from "react";
import { MessageReader } from "rosbag";

import { getExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import type { MemoryCacheBlock } from "webviz-core/src/dataProviders/MemoryCacheDataProvider";
import type { DataProviderMessage } from "webviz-core/src/dataProviders/types";
import { useMessageReducer } from "webviz-core/src/PanelAPI/useMessageReducer";
import { useShallowMemo } from "webviz-core/src/util/hooks";

// This is a fairly low-level API -- parsing eagerly and caching the result is not sustainable, but
// anyone who asks for binary data probably wants to parse it and cache it somehow, so give the
// user a parser and the messages in a block-format useful for caching.

type MessageBlock = $ReadOnly<{
  [topicName: string]: $ReadOnlyArray<DataProviderMessage>,
}>;

type BlocksForTopics = {|
  // TODO(jp/steel): Figure out whether it's better to return message definitions here. It's
  // possible consumers will want to pass the readers through worker boundaries.
  messageReadersByTopic: { [topicName: string]: MessageReader },
  // Semantics of blocks: Missing topics have not been cached. Adjacent elements are contiguous
  // in time. Corresponding indexes in different BlocksForTopics cover the same time-range. Blocks
  // are stored in increasing order of time.
  blocks: $ReadOnlyArray<MessageBlock>,
|};

// Memoization probably won't speed up the filtering appreciably, but preserves return identity.
// That said, MessageBlock identity will change when the set of topics changes, so consumers should
// prefer to use the identity of topic-block message arrays where possible.
const filterBlockByTopics = memoizeWeak(
  (block: ?MemoryCacheBlock, topics: $ReadOnlyArray<string>): MessageBlock => {
    if (!block) {
      // For our purposes, a missing MemoryCacheBlock just means "no topics have been cached for
      // this block". This is semantically different to an empty array per topic, but not different
      // to a MemoryCacheBlock with no per-topic arrays.
      return {};
    }
    const ret = {};
    for (const topic of topics) {
      // Don't include an empty array when the data has not been cached for this topic for this
      // block. The missing entry means "we don't know the message for this topic in this block", as
      // opposed to "we know there are no messages for this topic in this block".
      if (block.messagesByTopic[topic]) {
        ret[topic] = block.messagesByTopic[topic];
      }
    }
    return ret;
  }
);

const useSubscribeToTopics = (topics) => {
  // A no-op reducer that accepts messages on a given list of topics, ignores them, and returns
  // nothing.
  // TODO(steel/jp): This subscription should not request that data be eagerly parsed. We should
  // also make a nicer way to express subscriptions.
  useMessageReducer<void>(
    useMemo(
      () => ({
        topics,
        restore: () => {},
        addMessage: (state, message) => state,
      }),
      [topics]
    )
  );
};

// A note: for the moment,
//  - not all players provide blocks, and
//  - topics for webviz nodes are not available in blocks when blocks _are_ provided,
// so all consumers need a "regular playback" pipeline fallback for now.
// Consumers can rely on the presence of topics in messageDefinitionsByTopic to signal whether
// a fallback is needed for a given topic, because entries will not be populated in these cases.
export function useBlocksByTopic(topics: $ReadOnlyArray<string>): BlocksForTopics {
  const requestedTopics = useShallowMemo(topics);

  // Subscribe to the topics
  useSubscribeToTopics(requestedTopics);

  // Get player data needed.
  const messageDefinitionsByTopic = useMessagePipeline(
    useCallback(({ playerState }) => playerState.activeData?.messageDefinitionsByTopic, [])
  );

  // Get blocks for the topics
  const allBlocks = useMessagePipeline(useCallback(({ playerState }) => playerState.progress.blocks, []));

  const exposeBlockData = !!allBlocks && getExperimentalFeature("preloading");

  const messageReadersByTopic = useMemo(
    () => {
      if (!exposeBlockData) {
        // Do not provide any readers if the player does not provide blocks. A missing reader
        // signals that binary data will never appear for a topic.
        return {};
      }
      const result = {};
      for (const topic of requestedTopics) {
        if (messageDefinitionsByTopic && messageDefinitionsByTopic[topic]) {
          result[topic] = new MessageReader(messageDefinitionsByTopic[topic]);
        }
      }
      return result;
    },
    [messageDefinitionsByTopic, requestedTopics, exposeBlockData]
  );

  const blocks = useMemo(
    () => {
      if (!allBlocks) {
        return [];
      }
      // Filter by messageReadersByTopic so we only get messages we know we can parse.
      const definedTopics = Object.keys(messageReadersByTopic);
      const ret = [];
      // Note: allBlocks.map() misbehaves, because allBlocks is initialized like "new Array(...)".
      for (let i = 0; i < allBlocks.length; ++i) {
        ret.push(filterBlockByTopics(allBlocks[i], definedTopics));
      }
      return ret;
    },
    [allBlocks, messageReadersByTopic]
  );

  return useShallowMemo({ messageReadersByTopic, blocks });
}
