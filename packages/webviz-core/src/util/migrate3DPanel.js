// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz";

// change this as needed to provide backward compatibility with old saved props
export const SAVED_PROPS_VERSION = 15;

export default function migrate3DPanel(config: ThreeDimensionalVizConfig): ThreeDimensionalVizConfig {
  if (config.savedPropsVersion === SAVED_PROPS_VERSION) {
    return config;
  }

  return {
    ...config,
    savedPropsVersion: SAVED_PROPS_VERSION,
  };
}
