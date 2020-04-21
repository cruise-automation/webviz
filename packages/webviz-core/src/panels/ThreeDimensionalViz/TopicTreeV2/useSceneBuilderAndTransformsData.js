// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useMemo } from "react";

import type { UseSceneBuilderAndTransformsDataInput, UseSceneBuilderAndTransformsDataOutput } from "./types";
import { useShallowMemo } from "webviz-core/src/util/hooks";

export default function useSceneBuilderAndTransformsData({
  sceneBuilder,
  transforms,
  staticallyAvailableNamespacesByTopic,
}: UseSceneBuilderAndTransformsDataInput): UseSceneBuilderAndTransformsDataOutput {
  const availableTfs = useShallowMemo(transforms.values().map(({ id }) => id));
  const availableNamespacesByTopic = useMemo(
    () => {
      const result = { ...staticallyAvailableNamespacesByTopic };
      for (const { name, topic } of sceneBuilder.allNamespaces) {
        result[topic] = result[topic] || [];
        result[topic].push(name);
      }
      if (availableTfs.length) {
        result["/tf"] = availableTfs;
      }
      return result;
    },
    [availableTfs, sceneBuilder.allNamespaces, staticallyAvailableNamespacesByTopic]
  );
  return { availableNamespacesByTopic };
}
