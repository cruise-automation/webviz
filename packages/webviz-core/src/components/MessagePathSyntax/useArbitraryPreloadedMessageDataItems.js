// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useMemo } from "react";

import parseRosPath from "./parseRosPath";
import {
  fillInGlobalVariablesInPath,
  getMessagePathDataItems,
  type MessagePathDataItem,
} from "./useCachedGetMessagePathDataItems";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import * as PanelAPI from "webviz-core/src/PanelAPI";

export default function useArbitraryPreloadedMessageDataItems(path: string, bigInts: ?true): ?(MessagePathDataItem[]) {
  const rosPath = useMemo(() => parseRosPath(path), [path]);
  const { topics: providerTopics, datatypes } = PanelAPI.useDataSourceInfo();
  const { globalVariables } = useGlobalVariables();
  const filledInPath = useMemo(() => rosPath && fillInGlobalVariablesInPath(rosPath, globalVariables), [
    globalVariables,
    rosPath,
  ]);

  const arbitraryTopicMessage = PanelAPI.useArbitraryTopicMessage(rosPath?.topicName || "");
  return useMemo(() => {
    if (arbitraryTopicMessage && filledInPath) {
      return getMessagePathDataItems(
        // recieveTime is not useful here, since the message is completely arbitrary.
        { message: arbitraryTopicMessage, topic: filledInPath.topicName, receiveTime: { sec: 0, nsec: 0 } },
        filledInPath,
        providerTopics,
        datatypes,
        bigInts
      );
    }
  }, [arbitraryTopicMessage, bigInts, datatypes, filledInPath, providerTopics]);
}
