// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import memoizeOne from "memoize-one";
import { useCallback, useMemo, useRef } from "react";

import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import { useSubscribeToTopicsForBlocks } from "webviz-core/src/PanelAPI/useBlocksByTopic";
import type { Topic, BobjectMessage } from "webviz-core/src/players/types";
import { deepParse } from "webviz-core/src/util/binaryObjects";
import { useContextSelector } from "webviz-core/src/util/hooks";

export default function useArbitraryTopicMessage<T>(topic: string): ?T {
  // Subscribe to the topics
  useSubscribeToTopicsForBlocks(useMemo(() => [topic], [topic]));

  const lastPlayerIdForProcessedMessageRef = useRef<?string>();

  const getIsTopicPreloadable = useCallback(
    memoizeOne((topicName: string, topics: Topic[]) => topics.find((t) => t.name === topicName)?.preloadable || false),
    []
  );

  const { parsedMessage } = useMessagePipeline<{ parsedMessage: ?T }>(
    useCallback(({ playerState: { progress, playerId, activeData } }) => {
      // If the player hasn't changed (AKA, no sources have been added or removed), and we already have a message
      // to send to children, just bail here so that we don't force an update.
      if (lastPlayerIdForProcessedMessageRef.current === playerId) {
        return useContextSelector.BAILOUT;
      }

      let message;
      if (activeData && getIsTopicPreloadable(topic, activeData.topics)) {
        // Preloading codepath: read from the blocks
        const blocks = progress.messageCache?.blocks || [];
        // Note: allBlocks.find() misbehaves, because allBlocks is initialized like "new Array(...)".
        for (let i = 0; i < blocks.length; ++i) {
          const firstBobjectMessage: ?BobjectMessage = blocks[i]?.messagesByTopic?.[topic]?.[0];
          if (firstBobjectMessage) {
            message = deepParse(firstBobjectMessage.message);
            break;
          }
        }
      } else if (activeData) {
        // Non-preloading codepath: read from the active messages
        const bobjectMessage = activeData.bobjects.find((_message) => _message.topic === topic);
        message = bobjectMessage ? deepParse(bobjectMessage.message) : undefined;
      }

      // Only set the playerId if we have a message. If we don't, we want to search for the message next time.
      if (message) {
        lastPlayerIdForProcessedMessageRef.current = playerId;
      }
      return { parsedMessage: message };
    }, [getIsTopicPreloadable, topic])
  );

  return parsedMessage;
}
