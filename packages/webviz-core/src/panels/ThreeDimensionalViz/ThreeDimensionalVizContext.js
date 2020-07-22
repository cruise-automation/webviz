// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { noop } from "lodash";
import React from "react";

import type { Color } from "webviz-core/src/types/Messages";

// Used to check if a Marker's path matches a value
// For a marker: { foo: { bar: "baz" } }
// markerKeyPath: ['foo', 'bar'] has a value of "baz"
export type MarkerPathCheck = {|
  markerKeyPath?: string[],
  value?: any,
|};

export type MarkerMatcher = {|
  topic: string,

  // When set, any markers passing all the checks will have their color overridden with this color
  color?: Color,

  // MarkerMatchers "match" if ALL checks pass
  checks?: MarkerPathCheck[],
|};

export const ThreeDimensionalVizContext = React.createContext<{
  setHoveredMarkerMatchers: (markerMatchers: MarkerMatcher[]) => void,
}>({ setHoveredMarkerMatchers: noop });
