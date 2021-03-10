// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type { FeatureSettings } from "webviz-core/src/components/ExperimentalFeatures/types";

export type WorldContextType = $ReadOnly<{
  // Not an exact type -- could have extra properties from hooks.
  experimentalFeatures: FeatureSettings,
}>;

// Data used in World and child components when "fancy" things won't work in a Worker.
const WorldContext = React.createContext<?WorldContextType>();

export function useWorldContext(): WorldContextType {
  const context = React.useContext(WorldContext);
  if (!context) {
    throw new Error("Tried to use WorldContext outside a <WorldContext.Provider />");
  }
  return context;
}

export default WorldContext;
