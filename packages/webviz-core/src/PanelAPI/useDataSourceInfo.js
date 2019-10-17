// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useMemo, useContext, useCallback } from "react";
import { type Time } from "rosbag";

import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import PanelContext from "webviz-core/src/components/PanelContext";
import filterMap from "webviz-core/src/filterMap";
import { type Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// Metadata about the source of data currently being displayed in Webviz.
// This is not expected to change often, usually when changing data sources.
export type DataSourceInfo = {|
  topics: $ReadOnlyArray<Topic>,
  datatypes: RosDatatypes,
  capabilities: string[],
  startTime: ?Time,
  endTime: ?Time,
|};

export default function useDataSourceInfo(): DataSourceInfo {
  const { topicPrefix = "" } = useContext(PanelContext) || {};
  const datatypes = useMessagePipeline(useCallback(({ datatypes }) => datatypes, []));
  const prefixedTopics = useMessagePipeline(useCallback(({ sortedTopics }) => sortedTopics, []));
  const startTime = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => activeData && activeData.startTime, [])
  );
  const endTime = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => activeData && activeData.endTime, [])
  );
  const capabilities = useMessagePipeline(useCallback(({ playerState: { capabilities } }) => capabilities, []));

  const unprefixedTopics = useMemo(
    () =>
      topicPrefix
        ? filterMap(prefixedTopics, ({ name, datatype }) =>
            name.startsWith(topicPrefix) ? { name: name.slice(topicPrefix.length), datatype } : null
          )
        : prefixedTopics,
    [topicPrefix, prefixedTopics]
  );

  return {
    topics: unprefixedTopics,
    datatypes,
    capabilities,
    startTime,
    endTime,
  };
}
