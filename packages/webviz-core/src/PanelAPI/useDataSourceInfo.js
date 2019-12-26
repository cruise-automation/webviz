// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useCallback } from "react";
import { type Time } from "rosbag";

import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import { type Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// Metadata about the source of data currently being displayed in Webviz.
// This is not expected to change often, usually when changing data sources.
export type DataSourceInfo = {|
  topics: $ReadOnlyArray<Topic>,
  datatypes: RosDatatypes,
  capabilities: string[],
  startTime: ?Time, // Only `startTime`, since `endTime` can change rapidly when connected to a live system.
  playerId: string,
|};

export default function useDataSourceInfo(): DataSourceInfo {
  const datatypes = useMessagePipeline(useCallback(({ datatypes: pipelineDatatypes }) => pipelineDatatypes, []));
  const topics = useMessagePipeline(useCallback(({ sortedTopics }) => sortedTopics, []));
  const startTime = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => activeData && activeData.startTime, [])
  );
  const capabilities = useMessagePipeline(
    useCallback(({ playerState: { capabilities: playerStateCapabilities } }) => playerStateCapabilities, [])
  );
  const playerId = useMessagePipeline(
    useCallback(({ playerState: { playerId: playerStatePlayerId } }) => playerStatePlayerId, [])
  );

  return {
    topics,
    datatypes,
    capabilities,
    startTime,
    playerId,
  };
}
