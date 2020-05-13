// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { cloneDeep } from "lodash";

import { defaultPlaybackConfig, type PanelsState } from "webviz-core/src/reducers/panels";

function migratePlaybackConfig(state: PanelsState): PanelsState {
  const panelsState = cloneDeep(state);
  const { playbackConfig } = panelsState;
  return {
    ...panelsState,
    playbackConfig: { ...defaultPlaybackConfig, ...playbackConfig },
  };
}

export default migratePlaybackConfig;
