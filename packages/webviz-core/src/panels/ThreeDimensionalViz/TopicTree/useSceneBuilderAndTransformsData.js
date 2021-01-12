// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mapKeys, difference } from "lodash";
import { useMemo, useRef } from "react";

import type { UseSceneBuilderAndTransformsDataInput, UseSceneBuilderAndTransformsDataOutput } from "./types";
import { generateNodeKey } from "./useTopicTree";
import useDataSourceInfo from "webviz-core/src/PanelAPI/useDataSourceInfo";
import { TRANSFORM_TOPIC } from "webviz-core/src/util/globalConstants";
import { useChangeDetector, useDeepMemo } from "webviz-core/src/util/hooks";

// Derived namespace and error information for TopicTree from sceneBuilder and transforms.
export default function useSceneBuilderAndTransformsData({
  sceneBuilder,
  transforms,
  staticallyAvailableNamespacesByTopic,
}: UseSceneBuilderAndTransformsDataInput): UseSceneBuilderAndTransformsDataOutput {
  const { playerId } = useDataSourceInfo();
  const hasChangedPlayerId = useChangeDetector([playerId], false);

  const newAvailableTfs = transforms
    .values()
    .map(({ id }) => id)
    .filter(Boolean);
  const availableTfsRef = useRef<string[]>(newAvailableTfs);
  if (hasChangedPlayerId) {
    // If we have changed the playerId - meaning that we've added or removed a source - recalculate the available TFs
    // from scratch.
    availableTfsRef.current = newAvailableTfs;
  } else {
    const tfsNotYetAdded = difference(newAvailableTfs, availableTfsRef.current);
    // Only add TFs, never remove them. If we've seen them once in the bag, they may re-appear.
    // NOTE: changing this to instead show the exact TFs available at this point in time is NOT advisable. There is a
    // subtle bug that will lead to the topic tree "jumping" in position as TFs are quickly removed and then re-added
    // whenever a topic is added.
    if (tfsNotYetAdded.length) {
      availableTfsRef.current = [...availableTfsRef.current, ...tfsNotYetAdded];
    }
  }
  const availableTfs = availableTfsRef.current;

  const availableNamespacesByTopic = useMemo(() => {
    const result = { ...staticallyAvailableNamespacesByTopic };
    for (const { name, topic } of sceneBuilder.allNamespaces) {
      result[topic] = result[topic] || [];
      result[topic].push(name);
    }
    if (availableTfs.length) {
      result[TRANSFORM_TOPIC] = availableTfs;
    }
    return result;
  }, [availableTfs, sceneBuilder.allNamespaces, staticallyAvailableNamespacesByTopic]);

  const sceneErrorsByKey = useMemo(
    () => mapKeys(sceneBuilder.errorsByTopic, (value, topicName) => generateNodeKey({ topicName })),
    [sceneBuilder.errorsByTopic]
  );

  const sceneErrorsByKeyMemo = useDeepMemo(sceneErrorsByKey);

  return { availableNamespacesByTopic, sceneErrorsByKey: sceneErrorsByKeyMemo };
}
