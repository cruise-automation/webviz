// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Frame } from "webviz-core/src/players/types";
import type { Color, Pose } from "webviz-core/src/types/Messages";

export type SkipTransformSpec = $ReadOnly<{| frameId: string, sourceTopic: string |}>;

export type ThreeDimensionalVizHooks = $ReadOnly<{|
  getSelectionState: ({ [string]: any }) => any, // arg is globalVariables
  getTopicsToRender: (any, any) => Set<string>, // args are selection states
  skipTransformFrame: ?SkipTransformSpec,
  getMarkerColor: (string, Color) => Color,
  getOccupancyGridValues: (string) => [number, string], // arg is topic, return value is [alpha, map].
  getFlattenedPose: (Frame) => ?Pose,
  getSyntheticArrowMarkerColor: (string) => Color, // arg is topic
  consumeMessage: (string, string, any, any, any) => void, // topic, datatype, message, consumeFns, misc
  consumeBobject: (string, string, any, any, any) => void, // topic, datatype, message, consumeFns, misc
  addMarkerToCollector: (any, any) => boolean, // marker collector, marker
|}>;
