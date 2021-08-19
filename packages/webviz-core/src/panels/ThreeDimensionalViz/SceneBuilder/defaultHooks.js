// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ThreeDimensionalVizHooks } from "./types";
import PoseMarkers from "webviz-core/src/panels/ThreeDimensionalViz/commands/PoseMarkers";
import { defaultMapPalette } from "webviz-core/src/panels/ThreeDimensionalViz/commands/utils";
import LaserScanVert from "webviz-core/src/panels/ThreeDimensionalViz/LaserScanVert";
import { TF2_MSGS$TF_MESSAGE } from "webviz-core/src/util/globalConstants";

const sceneBuilderHooks: ThreeDimensionalVizHooks = {
  getSelectionState: () => {},
  getTopicsToRender: () => new Set(),
  consumeBobject: (topic, datatype, msg, consumeMethods, { errors }) => {
    // TF messages are consumed by TransformBuilder, not SceneBuilder.
    if (datatype === TF2_MSGS$TF_MESSAGE) {
      return;
    }
    errors.topicsWithError.set(topic, `Unrecognized topic datatype for scene: ${datatype}`);
  },
  addMarkerToCollector: () => false,
  getSyntheticArrowMarkerColor: () => ({ r: 0, g: 0, b: 1, a: 0.5 }),
  getFlattenedPose: () => undefined,
  getOccupancyGridValues: (_topic) => [0.5, "map"],
  getMarkerColor: (topic, markerColor) => markerColor,

  // Duplicated in top-level 3D panel hooks
  skipTransformFrame: null,
  MapComponent: null,
  renderAdditionalMarkers: () => {},
  LaserScanVert,
  getMapPalette() {
    return defaultMapPalette;
  },
  useWorldspacePointSize: true,
  sphericalRangeScale: 1,
  allSupportedMarkers: [
    "arrow",
    "cube",
    "cubeList",
    "cylinder",
    "filledPolygon",
    "grid",
    "instancedLineList",
    "laserScan",
    "linedConvexHull",
    "lineList",
    "lineStrip",
    "overlayIcon",
    "radarPointCluster",
    "pointcloud",
    "points",
    "poseMarker",
    "sphere",
    "sphereList",
    "text",
    "triangleList",
  ],
  PoseMarkers,
  rootTransformFrame: "map",
  getStaticallyAvailableNamespacesByTopic: () => ({}),
};

export default sceneBuilderHooks;
