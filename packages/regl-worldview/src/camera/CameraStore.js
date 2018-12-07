//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// @flow
import { vec3, quat } from 'gl-matrix';
import isEqual from 'lodash/isEqual';
import selectors from './cameraStateSelectors';
import type { Vec2, Vec3, Vec4 } from '../types';

export type CameraState = {|
  distance: number,
  perspective: boolean,
  phi: number,
  target: Vec3,
  targetOffset: Vec3,
  targetOrientation: Vec4,
  thetaOffset: number,
|};

//  we use up on the +z axis
const UNIT_Z_VECTOR = Object.freeze([0, 0, 1]);
// reusable array for intermediate calculations
const TEMP_QUAT = [0, 0, 0, 0];

export const DEFAULT_CAMERA_STATE: CameraState = {
  distance: 75,
  perspective: false,
  phi: Math.PI / 4,
  target: [0, 0, 0],
  targetOffset: [0, 0, 0],
  targetOrientation: [0, 0, 0, 1],
  thetaOffset: 0,
};

function distanceAfterZoom(startingDistance: number, zoomPercent: number): number {
  // keep distance above 0 so that percentage-based zoom always works
  return Math.max(0.001, startingDistance * (1 - zoomPercent / 100));
}

export default class CameraStore {
  state: CameraState;

  _onChange: (CameraState) => void;

  constructor(handler: (CameraState) => void = () => {}, initialCameraState: CameraState = DEFAULT_CAMERA_STATE) {
    this._onChange = handler;
    this.state = initialCameraState;
  }

  setCameraState = (state: CameraState) => {
    this.state = state;
  };

  _setStateAndNotify(cameraState: CameraState) {
    // we only want to call onChange when cameraState values actually changes, as each
    // onChange will trigger Worldview to rerender by forceUpdate or onCameraStateChange
    if (!isEqual(this.state, cameraState)) {
      this.state = cameraState;
      this._onChange(this.state);
    }
  }

  cameraRotate = ([x, y]: Vec2) => {
    const { thetaOffset, phi } = this.state;

    this._setStateAndNotify({
      ...this.state,
      thetaOffset: thetaOffset - x,
      phi: Math.max(0, Math.min(phi + y, Math.PI)),
    });
  };

  // move the camera along x, y axis; do not move up/down
  cameraMove = ([x, y]: Vec2) => {
    const { targetOffset, thetaOffset } = this.state;

    // rotate around z axis so the offset is in the target's reference frame
    const result = [x, y, 0];
    const offset = vec3.transformQuat(result, result, quat.setAxisAngle(TEMP_QUAT, UNIT_Z_VECTOR, -thetaOffset));

    this._setStateAndNotify({
      ...this.state,
      targetOffset: vec3.add(offset, targetOffset, offset),
    });
  };

  cameraZoom = (zoomPercent: number) => {
    const { distance } = this.state;
    const newDistance: number = distanceAfterZoom(distance, zoomPercent);
    this._setStateAndNotify({
      ...this.state,
      distance: newDistance,
    });
  };
}

export { selectors };
