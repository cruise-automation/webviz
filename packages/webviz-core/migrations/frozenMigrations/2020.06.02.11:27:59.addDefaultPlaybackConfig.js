// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

const DEFAULT_PLAYBACK_CONFIG = { speed: 0.2, messageOrder: "receiveTime" };

export default (originalPanelsState: any): any => ({
  ...originalPanelsState,
  playbackConfig: {
    ...DEFAULT_PLAYBACK_CONFIG,
    ...originalPanelsState.playbackConfig,
  },
});
