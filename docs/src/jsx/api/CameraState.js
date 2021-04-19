// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { quat, vec3 } from "gl-matrix";
import React, { useState } from "react";
import Worldview, { Arrows, Spheres, Axes, Grid, cameraStateSelectors, type CameraState } from "regl-worldview";

import CameraStateControls from "../utils/CameraStateControls";

export default function Example() {
  const getPoseFromVecs = (position, orientation) => {
    const [x, y, z, w] = orientation;
    const [x1, y1, z1] = position;
    return {
      orientation: { x, y, z, w },
      position: { x: x1, y: y1, z: z1 },
    };
  };
  const [cameraState, setCameraState] = useState<CameraState>({
    perspective: true,
    distance: 50,
    thetaOffset: 0.3,
    phi: 0.85,
    target: [0, 0, 0],
    targetOrientation: [0, 0, 0, 1],
    targetOffset: [0, 0, 0],
    fovy: Math.PI / 4,
    near: 0.01,
    far: 1000,
  });

  const targetHeading = cameraStateSelectors.targetHeading(cameraState);

  const poseArrowMarker = {
    pose: getPoseFromVecs(cameraState.target, cameraState.targetOrientation),
    scale: { x: 20, y: 3, z: 3 },
    color: { r: 1, g: 0, b: 1, a: 1 },
  };

  const arrowLength = 10;
  const cameraPosition = cameraState.perspective
    ? vec3.copy(
        [0, 0, 0],
        cameraStateSelectors.position({
          ...cameraState,
          distance: cameraState.distance + arrowLength,
        })
      )
    : [0, 0, cameraState.distance + arrowLength];
  vec3.add(cameraPosition, cameraPosition, cameraState.targetOffset);
  vec3.rotateZ(cameraPosition, cameraPosition, [0, 0, 0], -targetHeading);
  vec3.add(cameraPosition, cameraPosition, cameraState.target);

  const cameraOrientation = [0, 0, 0, 1];
  quat.rotateZ(cameraOrientation, cameraOrientation, -targetHeading);
  quat.multiply(cameraOrientation, cameraOrientation, cameraStateSelectors.orientation(cameraState));
  quat.rotateY(cameraOrientation, cameraOrientation, Math.PI / 2);

  const cameraArrowMarker = {
    pose: getPoseFromVecs(cameraPosition, cameraOrientation),
    scale: { x: arrowLength, y: 2, z: 2 },
    color: { r: 0, g: 1, b: 1, a: 0.5 },
  };

  // show the camera target as a white dot
  const spherePos = vec3.transformQuat([0, 0, 0], cameraState.targetOffset, cameraState.targetOrientation);
  vec3.add(spherePos, spherePos, cameraState.target);
  const sphereMarker = {
    pose: {
      position: {
        x: spherePos[0],
        y: spherePos[1],
        z: spherePos[2] + 2, // extra offset to make sure sphere is visible in 2D mode
      },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
    scale: { x: 1, y: 1, z: 1 },
    color: { r: 1, g: 1, b: 1, a: 1 },
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}>
      <CameraStateControls cameraState={cameraState} setCameraState={setCameraState} />
      <div style={{ display: "flex", height: 500, overflow: "hidden" }}>
        <div style={{ flex: "1 1 0" }}>
          <Worldview cameraState={cameraState} onCameraStateChange={(cameraState) => setCameraState(cameraState)}>
            <Arrows>{[poseArrowMarker]}</Arrows>
            <Spheres>{[sphereMarker]}</Spheres>
            <Grid count={10} />
            <Axes />
          </Worldview>
        </div>

        <div style={{ flex: "1 1 0" }}>
          <Worldview
            defaultCameraState={{
              perspective: true,
              distance: 150,
              thetaOffset: 0.5,
              phi: 1,
              target: [0, 0, 0],
              targetOffset: [0, 0, 0],
              targetOrientation: [0, 0, 0, 1],
            }}>
            <Arrows>{[poseArrowMarker, cameraArrowMarker]}</Arrows>
            <Spheres>{[sphereMarker]}</Spheres>
            <Axes />
            <Grid count={10} />
          </Worldview>
        </div>
      </div>
    </div>
  );
}
