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
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { Message } from "webviz-core/src/players/types";

type MessageAndData = {| message: Message, queriedData: MessagePathDataItem[] |};

// Get the last message for a path, but *after* applying filters. In other words, we'll keep the
// last message that matched.
export function useLatestMessageDataItem(path: string): ?MessageAndData {
  const rosPath = useMemo(() => parseRosPath(path), [path]);
  const topics = useMemo(() => (rosPath ? [rosPath.topicName] : []), [rosPath]);
  const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems([path]);

  const addMessage: (?MessageAndData, Message) => ?MessageAndData = useCallback(
    (prevMessageAndData: ?MessageAndData, message: Message) => {
      const queriedData = cachedGetMessagePathDataItems(path, message);
      if (!queriedData) {
        return;
      }
      if (queriedData.length > 0) {
        return { message, queriedData };
      }
      return prevMessageAndData;
    },
    [cachedGetMessagePathDataItems, path]
  );

  const restore = useCallback(
    (prevMessageAndData: ?MessageAndData): ?MessageAndData => {
      if (prevMessageAndData) {
        const queriedData = cachedGetMessagePathDataItems(path, prevMessageAndData.message);
        if (queriedData && queriedData.length > 0) {
          return { message: prevMessageAndData.message, queriedData };
        }
      }
    },
    [cachedGetMessagePathDataItems, path]
  );

  const messageAndData = PanelAPI.useMessageReducer({ topics, addMessage, restore });
  return rosPath ? messageAndData : undefined;
}
