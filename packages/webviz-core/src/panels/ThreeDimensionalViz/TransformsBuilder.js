// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mat4, quat, vec3 } from "gl-matrix";
import type { Vec3 } from "gl-matrix";

import Transforms, { Transform } from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { Marker, ArrowMarker, Color, MutablePose } from "webviz-core/src/types/Messages";
import type { MarkerProvider, MarkerCollector } from "webviz-core/src/types/Scene";
import { MARKER_MSG_TYPES } from "webviz-core/src/util/globalConstants";

const originPosition = { x: 0, y: 0, z: 0 };
const originOrientation = { x: 0, y: 0, z: 0, w: 1 };

const defaultArrowMarker = {
  id: "",
  header: {
    frame_id: "",
    stamp: {
      sec: 0,
      nsec: 0,
    },
  },
  ns: "tf-axes",
  type: 0,
  action: 0,
};

const defaultArrowScale = { x: 0.2, y: 0.02, z: 0.02 };

const getOriginPose = (): MutablePose => ({
  position: { ...originPosition },
  orientation: { ...originOrientation },
});

const unitXVector = vec3.fromValues(1, 0, 0);

type Axis = ArrowMarker & {
  id: string,
  color: Color,
  unitVector: Vec3,
};

const originAxes: Array<Axis> = [
  {
    ...defaultArrowMarker,
    scale: { ...defaultArrowScale },
    pose: {
      position: { ...originPosition },
      orientation: { ...originOrientation },
    },
    id: "X",
    color: { r: 1, g: 0, b: 0, a: 1 },
    unitVector: vec3.fromValues(1, 0, 0),
  },
  {
    ...defaultArrowMarker,
    scale: { ...defaultArrowScale },
    pose: {
      position: { ...originPosition },
      orientation: { ...originOrientation },
    },
    id: "Y",
    color: { r: 0, g: 1, b: 0, a: 1 },
    unitVector: vec3.fromValues(0, 1, 0),
  },
  {
    ...defaultArrowMarker,
    scale: { ...defaultArrowScale },
    pose: {
      position: { ...originPosition },
      orientation: { ...originOrientation },
    },
    id: "Z",
    color: { r: 0, g: 0, b: 1, a: 1 },
    unitVector: vec3.fromValues(0, 0, 1),
  },
];

const tempOrientation = [0, 0, 0, 0];

const getTransformedAxisArrowMarker = (id: string, transform: Transform, axis: Axis, rootTransformID: string) => {
  const { unitVector, id: axisId } = axis;
  quat.rotationTo(tempOrientation, unitXVector, unitVector);
  const pose = {
    position: { ...originPosition },
    orientation: { x: tempOrientation[0], y: tempOrientation[1], z: tempOrientation[2], w: tempOrientation[3] },
  };

  transform.apply(pose, pose, rootTransformID);

  return {
    ...axis,
    id: `${id}-${axisId}axis`,
    name: `${id}-${axisId}axis`,
    pose,
  };
};

const getAxesArrowMarkers = (id: string, transform: Transform, rootTransformID: string): ArrowMarker[] => {
  return originAxes.map((axis) => getTransformedAxisArrowMarker(id, transform, axis, rootTransformID));
};

const getAxisTextMarker = (id: string, transform: Transform, rootTransformID: string): Marker => {
  const textPose = getOriginPose();
  transform.apply(textPose, textPose, rootTransformID);
  // Lower it a little in world coordinates so it appears slightly below the axis origin (like in rviz).
  textPose.position.z = textPose.position.z - 0.02;
  return {
    header: {
      frame_id: "",
      stamp: {
        sec: 0,
        nsec: 0,
      },
    },
    ns: "tf-axes",
    action: 0,
    scale: { x: 1, y: 1, z: 1 },
    color: { r: 1, g: 1, b: 1, a: 1 },
    id: `${id}-name`,
    name: `${id}-name`,
    pose: textPose,
    type: MARKER_MSG_TYPES.TEXT_VIEW_FACING,
    text: id,
  };
};

const tempTranslation = [0, 0, 0];
// So we don't create a lot of effectively unused vectors / quats.
const throwawayQuat = { ...originOrientation };

// Exported for tests
export const getArrowToParentMarkers = (id: string, transform: Transform, rootTransformID: string): ArrowMarker[] => {
  const { parent } = transform;
  if (!parent) {
    return [];
  }

  // If the distance between the parent and child is 0, skip drawing an arrow between them.
  mat4.getTranslation(tempTranslation, transform.matrix);
  if (vec3.length(tempTranslation) <= 0) {
    return [];
  }

  let childPose = { position: { ...originPosition }, orientation: throwawayQuat };
  childPose = transform.apply(childPose, childPose, rootTransformID);

  let parentPose = { position: { ...originPosition }, orientation: throwawayQuat };
  parentPose = parent && parent.apply(parentPose, parentPose, rootTransformID);

  if (!childPose || !parentPose) {
    return [];
  }

  return [
    {
      ...defaultArrowMarker,
      pose: {
        position: { ...originPosition },
        orientation: { ...originOrientation },
      },
      id: `${id}-childToParentArrow`,
      color: { r: 1, g: 1, b: 0, a: 1 },
      points: [childPose.position, parentPose.position],
      scale: {
        // Intentionally different scale from the other arrows, to make the arrow head reasonable.
        x: 0.02,
        y: 0.01,
        z: 0.05,
      },
    },
  ];
};

export default class TransformsBuilder implements MarkerProvider {
  transforms: Transforms;
  rootTransformID: string;
  selections: string[] = [];

  setTransforms = (transforms: Transforms, rootTransformID: string) => {
    this.transforms = transforms;
    this.rootTransformID = rootTransformID;
  };

  addMarkersForTransform(add: MarkerCollector, id: string, transform: Transform, rootTransformID: string) {
    if (!transform.isChildOfTransform(rootTransformID)) {
      return;
    }
    const markersForTransform: Marker[] = [
      ...getAxesArrowMarkers(id, transform, rootTransformID),
      ...getArrowToParentMarkers(id, transform, rootTransformID),
      getAxisTextMarker(id, transform, rootTransformID),
    ];
    for (const marker of markersForTransform) {
      switch (marker.type) {
        case 0:
          add.arrow(marker);
          break;
        case 9:
          add.text(marker);
          break;
        default:
          console.warn("Marker for transform not supported", marker);
      }
    }
  }

  setSelectedTransforms(selections: string[]) {
    this.selections = selections;
  }

  renderMarkers = (add: MarkerCollector) => {
    const { selections, transforms } = this;
    if (!transforms) {
      return;
    }
    for (const key of selections) {
      const transform = this.transforms.get(key);
      if (!transform.isValid(this.rootTransformID)) {
        // If a marker doesn't exist yet, skip rendering for now, we might get the
        // transform in a later message, so we still want to keep it in selections.
        continue;
      }
      this.addMarkersForTransform(add, key, transform, this.rootTransformID);
    }
  };
}
