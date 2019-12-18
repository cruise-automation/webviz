// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { vec3 } from "gl-matrix";
import { mergeWith, get } from "lodash";
import { useRef } from "react";
import {
  type CameraState,
  type Vec3,
  type Vec4,
  type MouseEventObject,
  cameraStateSelectors,
  DEFAULT_CAMERA_STATE,
} from "regl-worldview";

import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import { emptyPose } from "webviz-core/src/util/Pose";

export type TargetPose = { target: Vec3, targetOrientation: Vec4 };

const ZOOM_LEVEL_URL_PARAM = "zoom";

function getZoomDistanceFromURLParam(): number | void {
  const params = new URLSearchParams(location && location.search);
  if (params.has(ZOOM_LEVEL_URL_PARAM)) {
    return parseFloat(params.get(ZOOM_LEVEL_URL_PARAM));
  }
}

// Get the camera target position and orientation
export function getTargetPose(followTf?: string | false, transforms: Transforms) {
  if (followTf) {
    let pose = emptyPose();
    pose = transforms.apply(pose, pose, followTf, transforms.rootOfTransform(followTf).id);
    if (pose) {
      const { x: px, y: py, z: pz } = pose.position;
      const { x: ox, y: oy, z: oz, w: ow } = pose.orientation;
      return {
        target: [px, py, pz],
        targetOrientation: [ox, oy, oz, ow],
      };
    }
  }
  return null;
}

// Return targetOffset and thetaOffset that would yield the same camera position as the
// given offsets if the target were (0,0,0) and targetOrientation were identity.
export function getEquivalentOffsetsWithoutTarget(
  offsets: { +targetOffset: Vec3, +thetaOffset: number },
  targetPose: { +target: Vec3, +targetOrientation: Vec4 },
  followOrientation?: boolean
): { targetOffset: Vec3, thetaOffset: number } {
  const heading = followOrientation
    ? cameraStateSelectors.targetHeading({ targetOrientation: targetPose.targetOrientation })
    : 0;
  const targetOffset = vec3.rotateZ([0, 0, 0], offsets.targetOffset, [0, 0, 0], -heading);
  vec3.add(targetOffset, targetOffset, targetPose.target);
  const thetaOffset = offsets.thetaOffset + heading;
  return { targetOffset, thetaOffset };
}

export function useComputedCameraState({
  currentCameraState,
  followTf,
  followOrientation,
  transforms,
}: {
  currentCameraState: $Shape<CameraState>,
  followTf?: string | false,
  followOrientation?: boolean,
  transforms: Transforms,
}): { cameraState: CameraState, targetPose: ?TargetPose } {
  let newCameraState = { ...currentCameraState };
  const targetPose = getTargetPose(followTf, transforms);
  // Store last seen target pose because the target may become available/unavailable over time as
  // the player changes, and we want to avoid moving the camera when it disappears.
  const lastTargetPoseRef = useRef<?TargetPose>(null);
  const lastTargetPose = lastTargetPoseRef.current;
  // Recompute cameraState based on the new inputs at each render
  if (targetPose) {
    lastTargetPoseRef.current = targetPose;
    newCameraState.target = targetPose.target;
    if (followOrientation) {
      newCameraState.targetOrientation = targetPose.targetOrientation;
    }
  } else if (followTf && lastTargetPose) {
    // If follow is enabled but no target is available (such as when seeking), keep the camera
    // position the same as it would have been by reusing the last seen target pose.
    newCameraState.target = lastTargetPose.target;
    if (followOrientation) {
      newCameraState.targetOrientation = lastTargetPose.targetOrientation;
    }
  }
  // Read the distance from URL when World is first loaded with empty cameraState distance in savedProps
  if (currentCameraState.distance == null) {
    newCameraState.distance = getZoomDistanceFromURLParam();
  }

  newCameraState = mergeWith(newCameraState, DEFAULT_CAMERA_STATE, (objVal, srcVal) => objVal ?? srcVal);

  return { cameraState: newCameraState, targetPose: targetPose || lastTargetPose };
}

export function getUpdatedGlobalVariablesBySelectedObject(
  selectedObject: MouseEventObject,
  linkedGlobalVariables: LinkedGlobalVariables
): ?GlobalVariables {
  const interactionData = selectedObject && selectedObject.object.interactionData;
  const objectTopic = interactionData && interactionData.topic;
  if (!linkedGlobalVariables.length || !objectTopic) {
    return;
  }
  const newGlobalVariables = {};
  linkedGlobalVariables.forEach(({ topic, markerKeyPath, name }) => {
    if (objectTopic === topic) {
      const objectForPath = get(selectedObject.object, [...markerKeyPath].reverse());
      newGlobalVariables[name] = objectForPath;
    }
  });
  return newGlobalVariables;
}
