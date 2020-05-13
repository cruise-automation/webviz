// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep, omit } from "lodash";

import { THREE_DIMENSIONAL_SAVED_PROPS_VERSION } from "webviz-core/migrations/constants/index";
import type { ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz";
import { toTopicTreeV2Nodes } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTreeV2/topicTreeV2Migrations";
import { type PanelsState } from "webviz-core/src/reducers/panels";
import { getPanelTypeFromId } from "webviz-core/src/util/layout";

function migrate3DPanelFn(originalConfig: ThreeDimensionalVizConfig): ThreeDimensionalVizConfig {
  let config = originalConfig;

  if (config.savedPropsVersion === THREE_DIMENSIONAL_SAVED_PROPS_VERSION) {
    return config;
  }
  if (!config.savedPropsVersion || config.savedPropsVersion < 16) {
    // Rename checked/expandedNodes to checked/expandedKeys
    config = {
      ...originalConfig,
      checkedKeys: originalConfig.checkedNodes || originalConfig.checkedKeys || [],
      expandedKeys: originalConfig.expandedNodes || originalConfig.expandedKeys || [],
    };
    // Remove legacy savedProps.
    config = omit(config, ["checkedNodes", "expandedNodes", "topicGroups", "hideMap", "useHeightMap", "follow"]);
  }
  const { savedPropsVersion, checkedKeys, expandedKeys } = config;

  let newCheckedKeys = [...checkedKeys];
  let newExpandedKeys = [...expandedKeys];
  if (!savedPropsVersion || savedPropsVersion < 17) {
    newCheckedKeys = toTopicTreeV2Nodes(newCheckedKeys);
    newExpandedKeys = toTopicTreeV2Nodes(newExpandedKeys);
  }

  return {
    ...config,
    checkedKeys: newCheckedKeys,
    expandedKeys: newExpandedKeys,
    savedPropsVersion: THREE_DIMENSIONAL_SAVED_PROPS_VERSION,
  };
}

export function migrate3DPanelSavedProps(migrateFn: (ThreeDimensionalVizConfig) => ThreeDimensionalVizConfig) {
  return function(originalPanelsState: PanelsState): PanelsState {
    if (!originalPanelsState.savedProps) {
      return originalPanelsState;
    }
    const panelsState = cloneDeep(originalPanelsState);
    for (const id of Object.keys(panelsState.savedProps)) {
      if (getPanelTypeFromId(id) === "3D Panel") {
        const oldSavedProps = panelsState.savedProps[id];
        panelsState.savedProps[id] = migrateFn(oldSavedProps);
      }
    }
    return panelsState;
  };
}

export default migrate3DPanelSavedProps(migrate3DPanelFn);
