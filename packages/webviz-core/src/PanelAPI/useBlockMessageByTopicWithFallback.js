// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useCallback, useMemo, useRef } from "react";

import * as PanelAPI from "webviz-core/src/PanelAPI";
import { blockMessageCache } from "webviz-core/src/PanelAPI/useBlocksByTopic";
import { useChangeDetector } from "webviz-core/src/util/hooks";

type DiagnosticMsgs$KeyValue = {|
  key: string,
  value: string,
|};

export type CruiseMsgs$Metadata = {|
  git_hash: string,
  map_hash: string,
  hostname: string,
  params: string,
  env_vars: string,
  city_name: string,
  param_modules_on_disk: DiagnosticMsgs$KeyValue[],
  semantic_db_version_live: string,
|};
export type CruiseMsgs$DriveId = {|
  data: string,
|};

function usePlaybackMessage<T>(topic: string): ?T {
  // DANGER! We circumvent PanelAPI.useMessageReducer's system of keeping state here.
  // We should rarely do that, since it's error-prone to implement your own
  // state management in panels. However, in this case it's really annoying that
  // the message gets reset to the default whenever a seek happens. (This is a more general
  // problem with static/latched topics that we should fix, possibly orthogonally to the
  // use of block message storage.)
  const lastMessage = useRef<?T>();

  const { playerId } = PanelAPI.useDataSourceInfo();
  const hasChangedPlayerId = useChangeDetector([playerId], false);
  if (hasChangedPlayerId) {
    lastMessage.current = undefined;
  }

  const newMessage = PanelAPI.useMessageReducer<?T>({
    topics: [topic],
    restore: useCallback((prevState) => prevState || lastMessage.current, [lastMessage]),
    addMessage: useCallback((prevState, { message }) => prevState || message, []),
    preloadingFallback: true,
  });
  lastMessage.current = newMessage;
  return lastMessage.current;
}

export default function useBlockMessageByTopicWithFallback<T>(topic: string): ?T {
  const { blocks, messageReadersByTopic } = PanelAPI.useBlocksByTopic([topic]);

  const binaryBlocksMessage = useMemo(() => {
    if (!messageReadersByTopic[topic]) {
      return;
    }
    const maybeBlockWithMessage = blocks.find((block) => block[topic]?.length);
    return maybeBlockWithMessage?.[topic]?.[0];
  }, [blocks, messageReadersByTopic, topic]);

  const parsedBlockMessage =
    binaryBlocksMessage && blockMessageCache.parseMessages([binaryBlocksMessage], messageReadersByTopic)[0]?.message;

  // Not all players provide blocks, so have a playback fallback.
  // TODO(steel/jp): Neither subscription should request eagerly-parsed binary messages once
  // we have an option for that.
  const playbackMessage = usePlaybackMessage(topic);
  return parsedBlockMessage || playbackMessage;
}
