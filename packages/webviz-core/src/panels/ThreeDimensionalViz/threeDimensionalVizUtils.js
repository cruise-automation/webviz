// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { vec3 } from "gl-matrix";
// eslint-disable-next-line no-restricted-imports
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
import type { InteractionData } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import { isBobject, deepParse } from "webviz-core/src/util/binaryObjects";
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

export function useTransformedCameraState({
  configCameraState,
  followTf,
  followOrientation,
  transforms,
}: {
  configCameraState: $Shape<CameraState>,
  followTf?: string | false,
  followOrientation?: boolean,
  transforms: Transforms,
}): { transformedCameraState: CameraState, targetPose: ?TargetPose } {
  let transformedCameraState = { ...configCameraState };
  const targetPose = getTargetPose(followTf, transforms);
  // Store last seen target pose because the target may become available/unavailable over time as
  // the player changes, and we want to avoid moving the camera when it disappears.
  const lastTargetPoseRef = useRef<?TargetPose>(null);
  const lastTargetPose = lastTargetPoseRef.current;
  // Recompute cameraState based on the new inputs at each render
  if (targetPose) {
    lastTargetPoseRef.current = targetPose;
    transformedCameraState.target = targetPose.target;
    if (followOrientation) {
      transformedCameraState.targetOrientation = targetPose.targetOrientation;
    }
  } else if (followTf && lastTargetPose) {
    // If follow is enabled but no target is available (such as when seeking), keep the camera
    // position the same as it would have been by reusing the last seen target pose.
    transformedCameraState.target = lastTargetPose.target;
    if (followOrientation) {
      transformedCameraState.targetOrientation = lastTargetPose.targetOrientation;
    }
  }
  // Read the distance from URL when World is first loaded with empty cameraState distance in savedProps
  if (configCameraState?.distance == null) {
    transformedCameraState.distance = getZoomDistanceFromURLParam();
  }

  transformedCameraState = mergeWith(
    transformedCameraState,
    DEFAULT_CAMERA_STATE,
    (objVal, srcVal) => objVal ?? srcVal
  );

  return { transformedCameraState, targetPose: targetPose || lastTargetPose };
}

export const getInstanceObj = (marker: any, idx: number): any => {
  if (!marker) {
    return;
  }
  if (!isBobject(marker)) {
    return marker?.metadataByIndex?.[idx];
  }
  if (!marker.metadataByIndex) {
    return;
  }
  return marker.metadataByIndex()?.[idx];
};
export const getObject = (selectedObject: MouseEventObject) => {
  const object =
    (selectedObject.instanceIndex !== undefined &&
      selectedObject.object.metadataByIndex !== undefined &&
      getInstanceObj(selectedObject.object, selectedObject.instanceIndex)) ||
    selectedObject?.object;
  return isBobject(object) ? deepParse(object) : object;
};
export const getInteractionData = (selectedObject: MouseEventObject): ?InteractionData =>
  selectedObject.object.interactionData || getObject(selectedObject)?.interactionData;

export function getUpdatedGlobalVariablesBySelectedObject(
  selectedObject: MouseEventObject,
  linkedGlobalVariables: LinkedGlobalVariables
): ?GlobalVariables {
  const object = getObject(selectedObject);
  const interactionData = getInteractionData(selectedObject);
  if (!linkedGlobalVariables.length || !interactionData?.topic) {
    return;
  }
  const newGlobalVariables = {};
  linkedGlobalVariables.forEach(({ topic, markerKeyPath, name }) => {
    if (interactionData?.topic === topic) {
      const objectForPath = get(object, [...markerKeyPath].reverse());
      newGlobalVariables[name] = objectForPath;
    }
  });
  return newGlobalVariables;
}

// Return targetOffset and thetaOffset that would yield the same camera position as the
// given offsets if the target were (0,0,0) and targetOrientation were identity.
function getEquivalentOffsetsWithoutTarget(
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

export function getNewCameraStateOnFollowChange({
  prevCameraState,
  prevTargetPose,
  prevFollowTf,
  prevFollowOrientation,
  newFollowTf,
  newFollowOrientation,
}: {|
  prevCameraState: CameraState,
  prevTargetPose: ?TargetPose,
  prevFollowTf: ?(string | false),
  prevFollowOrientation: ?boolean,
  newFollowTf: ?(string | false),
  newFollowOrientation: ?boolean,
|}): CameraState {
  const newCameraState = { ...prevCameraState };
  if (newFollowTf) {
    // When switching to follow orientation, adjust thetaOffset to preserve camera rotation.
    if (newFollowOrientation && !prevFollowOrientation && prevTargetPose) {
      const heading = cameraStateSelectors.targetHeading({
        targetOrientation: prevTargetPose.targetOrientation,
      });
      newCameraState.targetOffset = vec3.rotateZ(
        [0, 0, 0],
        newCameraState.targetOffset || DEFAULT_CAMERA_STATE.targetOffset,
        [0, 0, 0],
        heading
      );
      newCameraState.thetaOffset -= heading;
    }
    // When following a frame for the first time, snap to the origin.
    if (!prevFollowTf) {
      newCameraState.targetOffset = [0, 0, 0];
    }
  } else if (prevFollowTf && prevTargetPose) {
    // When unfollowing, preserve the camera position and orientation.
    Object.assign(
      newCameraState,
      getEquivalentOffsetsWithoutTarget(
        {
          targetOffset: prevCameraState.targetOffset || DEFAULT_CAMERA_STATE.targetOffset,
          thetaOffset: prevCameraState.thetaOffset || DEFAULT_CAMERA_STATE.thetaOffset,
        },
        prevTargetPose,
        !!prevFollowOrientation
      ),
      { target: [0, 0, 0] }
    );
  }

  return newCameraState;
}
