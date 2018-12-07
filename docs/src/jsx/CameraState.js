//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from 'react';
import { quat, vec3 } from 'gl-matrix';
import Worldview, { Arrows, Spheres, Axes, Grid, cameraStateSelectors } from 'regl-worldview';
import CameraStateControls from './CameraStateControls';
import CameraStateInfo from './CameraStateInfo';
import { p, q } from './utils';

function CameraState() {
  const [perspective, setPerspective] = useState(true);
  const [distance, setDistance] = useState(50);
  const [thetaOffset, setThetaOffset] = useState(0.3);
  const [phi, setPhi] = useState(0.85);
  const [orientationX, setOrientationX] = useState(0);
  const [orientationY, setOrientationY] = useState(0);
  const [orientationZ, setOrientationZ] = useState(0);

  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [offsetZ, setOffsetZ] = useState(0);

  let length = Math.hypot(orientationX, orientationY, orientationZ);
  if (length > 1) {
    length /= 2;
  }
  const orientationW = Math.sqrt(1 - length * length);

  const target = [posX, posY, posZ];
  const targetOffset = [offsetX, offsetY, offsetZ];
  const targetOrientation = [orientationX, orientationY, orientationZ, orientationW];

  const cameraState = {
    perspective,
    distance,
    thetaOffset,
    phi,
    target,
    targetOffset,
    targetOrientation,
  };

  const targetHeading = cameraStateSelectors.targetHeading(cameraState);

  const poseArrowMarker = {
    pose: {
      orientation: q(...cameraState.targetOrientation),
      position: p(...cameraState.target),
    },
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
    pose: {
      position: p(...cameraPosition),
      orientation: q(...cameraOrientation),
    },
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
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}>
      <CameraStateControls
        perspective={perspective}
        distance={distance}
        thetaOffset={thetaOffset}
        phi={phi}
        posX={posX}
        posY={posY}
        posZ={posZ}
        offsetX={offsetX}
        offsetY={offsetY}
        offsetZ={offsetZ}
        orientationX={orientationX}
        orientationY={orientationY}
        orientationZ={orientationZ}
        setPerspective={setPerspective}
        setDistance={setDistance}
        setThetaOffset={setThetaOffset}
        setPhi={setPhi}
        setPosX={setPosX}
        setPosY={setPosY}
        setPosZ={setPosZ}
        setOffsetX={setOffsetX}
        setOffsetY={setOffsetY}
        setOffsetZ={setOffsetZ}
        setOrientationX={setOrientationX}
        setOrientationY={setOrientationY}
        setOrientationZ={setOrientationZ}
      />
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <div style={{ flex: '1 1 0', overflow: 'hidden', height: 500 }}>
          <Worldview
            cameraState={cameraState}
            onCameraStateChange={({
              perspective,
              distance,
              thetaOffset,
              phi,
              target,
              targetOffset,
              targetOrientation,
            }) => {
              setPerspective(perspective);
              setDistance(distance);
              setThetaOffset(thetaOffset);
              setPhi(phi);
              setPosX(target[0]);
              setPosY(target[1]);
              setPosZ(target[2]);
              setOffsetX(targetOffset[0]);
              setOffsetY(targetOffset[1]);
              setOffsetZ(targetOffset[2]);
              setOrientationX(targetOrientation[0]);
              setOrientationY(targetOrientation[1]);
              setOrientationZ(targetOrientation[2]);
            }}>
            <Arrows>{[poseArrowMarker]}</Arrows>
            <Spheres>{[sphereMarker]}</Spheres>
            <Grid count={10} />
            <Axes />
            <CameraStateInfo cameraState={cameraState} />
          </Worldview>
        </div>

        <div style={{ flex: '1 1 0', overflow: 'hidden', height: 500 }}>
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

export default CameraState;
