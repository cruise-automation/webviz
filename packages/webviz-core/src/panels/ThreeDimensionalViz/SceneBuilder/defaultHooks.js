// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ThreeDimensionalVizHooks } from "./types";
import { TF_DATATYPE } from "webviz-core/src/util/globalConstants";

const sceneBuilderHooks: ThreeDimensionalVizHooks = {
  getSelectionState: () => {},
  getTopicsToRender: () => new Set(),
  consumeMessage: (topic, datatype, msg, consumeMethods, { errors }) => {
    // TF messages are consumed by TransformBuilder, not SceneBuilder.
    if (datatype === TF_DATATYPE) {
      return;
    }
    errors.topicsWithError.set(topic, `Unrecognized topic datatype for scene: ${datatype}`);
  },
  consumeBobject: (topic, datatype, msg, consumeMethods, { errors }) => {
    // TF messages are consumed by TransformBuilder, not SceneBuilder.
    if (datatype === TF_DATATYPE) {
      return;
    }
    errors.topicsWithError.set(topic, `Unrecognized topic datatype for scene: ${datatype}`);
  },
  addMarkerToCollector: () => false,
  getSyntheticArrowMarkerColor: () => ({ r: 0, g: 0, b: 1, a: 0.5 }),
  getFlattenedPose: () => undefined,
  getOccupancyGridValues: (_topic) => [0.5, "map"],
  getMarkerColor: (topic, markerColor) => markerColor,
  skipTransformFrame: null,
};

export default sceneBuilderHooks;
