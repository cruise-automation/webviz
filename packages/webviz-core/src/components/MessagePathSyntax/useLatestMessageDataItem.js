// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useCallback, useMemo } from "react";

import parseRosPath from "./parseRosPath";
import { useCachedGetMessagePathDataItems, type MessagePathDataItem } from "./useCachedGetMessagePathDataItems";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { Message, MessageFormat } from "webviz-core/src/players/types";
import { useChangeDetector } from "webviz-core/src/util/hooks";

type MessageAndData = {| message: Message, queriedData: MessagePathDataItem[] |};

// Get the last message for a path, but *after* applying filters. In other words, we'll keep the
// last message that matched.
export function useLatestMessageDataItem(path: string, format: MessageFormat, bigInts: ?true): ?MessageAndData {
  const rosPath = useMemo(() => parseRosPath(path), [path]);
  const topics = useMemo(() => (rosPath ? [rosPath.topicName] : []), [rosPath]);
  const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems([path]);

  const addMessages: (?MessageAndData, $ReadOnlyArray<Message>) => ?MessageAndData = useCallback((
    prevMessageAndData: ?MessageAndData,
    messages: $ReadOnlyArray<Message>
  ) => {
    // Iterate in reverse so we can early-return and not process all messages.
    for (let i = messages.length - 1; i >= 0; --i) {
      const message = messages[i];
      const queriedData = cachedGetMessagePathDataItems(path, message, bigInts);
      if (queriedData == null) {
        // Invalid path.
        return;
      }
      if (queriedData.length > 0) {
        return { message, queriedData };
      }
    }
    return prevMessageAndData;
  }, [bigInts, cachedGetMessagePathDataItems, path]);

  const restore = useCallback((prevMessageAndData: ?MessageAndData): ?MessageAndData => {
    if (prevMessageAndData) {
      const queriedData = cachedGetMessagePathDataItems(path, prevMessageAndData.message, bigInts);
      if (queriedData && queriedData.length > 0) {
        return { message: prevMessageAndData.message, queriedData };
      }
    }
  }, [bigInts, cachedGetMessagePathDataItems, path]);

  // A backfill is not automatically requested when the above callbacks' identities change, so we
  // need to do that manually.
  const { requestBackfill } = useMessagePipeline(
    useCallback((messagePipeline) => ({ requestBackfill: messagePipeline.requestBackfill }), [])
  );
  if (useChangeDetector([cachedGetMessagePathDataItems, path], false)) {
    requestBackfill();
  }

  const addMessageCallbackName = format === "parsedMessages" ? "addMessages" : "addBobjects";
  const messageAndData = PanelAPI.useMessageReducer({
    topics,
    [addMessageCallbackName]: addMessages,
    restore,
  });
  return rosPath ? messageAndData : undefined;
}
