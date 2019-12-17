// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { cloneDeep, isEmpty } from "lodash";

import type { PanelsState } from "webviz-core/src/reducers/panels";

export function migrateNodePlaygroundNodesToObjects(originalPanelsState: PanelsState): PanelsState {
  if (originalPanelsState.userNodes) {
    const panelsState = cloneDeep(originalPanelsState);
    for (const [nodeName, fieldVal] of Object.entries(panelsState.userNodes)) {
      if (typeof fieldVal === "string") {
        panelsState.userNodes[nodeName] = { name: nodeName, sourceCode: fieldVal };
      }
    }
    return panelsState;
  }
  return originalPanelsState;
}

// add panel related migrations
export function migrateGlobalDataToGlobalVariables(originalPanelsState: PanelsState): PanelsState {
  const globalData = originalPanelsState.globalData;
  if (globalData) {
    const panelsState = cloneDeep(originalPanelsState);
    // If `globalVariables` key is not present, create a new key and assign the globalData value
    if (!("globalVariables" in originalPanelsState)) {
      panelsState.globalVariables = globalData;
    }
    delete panelsState.globalData;
    return panelsState;
  }
  return originalPanelsState;
}

function migratePlaybackConfig(state: PanelsState): PanelsState {
  const panelsState = cloneDeep(state);
  const { playbackConfig } = panelsState;
  return {
    ...panelsState,
    playbackConfig: playbackConfig && !isEmpty(playbackConfig) ? playbackConfig : { speed: 0.2 },
  };
}

export default function migratePanels(originalPanelsState: PanelsState): PanelsState {
  if (originalPanelsState.layout === undefined) {
    return originalPanelsState;
  }
  try {
    return [migrateGlobalDataToGlobalVariables, migratePlaybackConfig, migrateNodePlaygroundNodesToObjects].reduce(
      (panelState, fn: (PanelsState) => PanelsState) => fn(panelState),
      originalPanelsState
    );
  } catch (error) {
    return originalPanelsState;
  }
}
