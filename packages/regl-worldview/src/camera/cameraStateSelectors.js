// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { vec3, quat, mat4 } from "gl-matrix";
import { createSelector } from "reselect";

import type { CameraState, Vec4, Vec3, Mat4 } from "../types";
import { fromSpherical } from "../utils/commandUtils";

const UNIT_X_VECTOR = Object.freeze([1, 0, 0]);

// reusable arrays for intermediate calculations
const TEMP_VEC3 = [0, 0, 0];
const TEMP_MAT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const TEMP_QUAT = [0, 0, 0, 0];

const stateSelector = (state: CameraState) => state;

const perspectiveSelector = createSelector(
  stateSelector,
  ({ perspective }) => perspective
);
const distanceSelector = createSelector(
  stateSelector,
  ({ distance }) => distance
);
const phiSelector = createSelector(
  stateSelector,
  ({ phi }) => phi
);
const thetaOffsetSelector = createSelector(
  stateSelector,
  ({ thetaOffset }) => thetaOffset
);
const targetOrientationSelector = createSelector(
  stateSelector,
  ({ targetOrientation }) => targetOrientation
);

// the heading direction of the target
const targetHeadingSelector: (CameraState) => number = createSelector(
  targetOrientationSelector,
  (targetOrientation) => {
    const out = vec3.transformQuat(TEMP_VEC3, UNIT_X_VECTOR, targetOrientation);
    const heading = -Math.atan2(out[1], out[0]);
    return heading;
  }
);

// orientation of the camera
const orientationSelector: (CameraState) => Vec4 = createSelector(
  perspectiveSelector,
  phiSelector,
  thetaOffsetSelector,
  (perspective, phi, thetaOffset) => {
    const result = quat.identity([0, 0, 0, 0]);
    quat.rotateZ(result, result, -thetaOffset);

    // phi is ignored in 2D mode
    if (perspective) {
      quat.rotateX(result, result, phi);
    }
    return result;
  }
);

// position of the camera
const positionSelector: (CameraState) => Vec3 = createSelector(
  thetaOffsetSelector,
  phiSelector,
  distanceSelector,
  (thetaOffset, phi, distance) => {
    const position = fromSpherical([], distance, thetaOffset, phi);

    // poles are on the y-axis in spherical coordinates; rearrange so they are on the z axis
    const [x, y, z] = position;
    position[0] = -x;
    position[1] = -z;
    position[2] = y;

    return position;
  }
);

/*
Get the view matrix, which transforms points from world coordinates to camera coordinates.

An equivalent and easier way to think about this transformation is that it takes the camera from
its actual position/orientation in the world, and moves it to have position=0,0,0 and orientation=0,0,0,1.

We build up this transformation in 5 steps as demonstrated below:
   T = target
   < = direction of target
   * = target with offset (position that the camera is looking at)
   C = camera (always points toward *)

Starting point: actual positions in world coordinates

  |      *
  |  <T   C
  |
  +--------

Step 1: translate target to the origin

  |
  |  *
 <T---C----

Step 2: rotate around the origin so the target points forward
(Here we use the target's heading only, ignoring other components of its rotation)

  |
  ^
  T--------
  |
  | *
  C

Step 3: translate the target-with-offset point to be at the origin

 ^
 T|
  |
  *--------
 C|
  |


Step 4: translate the camera to be at the origin
(Steps 3 and 4 are both translations, but they're kept separate because it's easier
to conceptualize: 3 uses the targetOffset and 4 uses the distance+thetaOffset+phi.)

 ^
 T
 |
 |*
 C--------
 |

Step 5: rotate the camera to point forward

 \
  T  |
     *
     C--------
     |

*/
const viewSelector: (CameraState) => Mat4 = createSelector(
  stateSelector,
  orientationSelector,
  positionSelector,
  targetHeadingSelector,
  ({ target, targetOffset, perspective }, orientation, position, targetHeading) => {
    const m = mat4.identity([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // apply the steps described above in reverse because we use right-multiplication

    // 5. rotate camera to point forward
    mat4.multiply(m, m, mat4.fromQuat(TEMP_MAT, quat.invert(TEMP_QUAT, orientation)));

    // 4. move camera to the origin
    if (perspective) {
      mat4.translate(m, m, vec3.negate(TEMP_VEC3, position));
    }

    // 3. move center to the origin
    mat4.translate(m, m, vec3.negate(TEMP_VEC3, targetOffset));

    // 2. rotate target to point forward
    mat4.rotateZ(m, m, targetHeading);

    // 1. move target to the origin
    vec3.negate(TEMP_VEC3, target);
    if (!perspective) {
      // if using orthographic camera ensure the distance from "ground"
      // stays large so no reasonably tall item goes past the camera
      TEMP_VEC3[2] = -2500;
    }
    mat4.translate(m, m, TEMP_VEC3);

    return m;
  }
);

const billboardRotation: (CameraState) => Mat4 = createSelector(
  orientationSelector,
  targetHeadingSelector,
  (orientation, targetHeading) => {
    const m = mat4.identity(mat4.create());
    mat4.rotateZ(m, m, -targetHeading);
    mat4.multiply(m, m, mat4.fromQuat(TEMP_MAT, orientation));
    return m;
  }
);

export default {
  orientation: orientationSelector,
  position: positionSelector,
  targetHeading: targetHeadingSelector,
  view: viewSelector,
  billboardRotation,
};
