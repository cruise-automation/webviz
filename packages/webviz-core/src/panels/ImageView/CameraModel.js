// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Point, CameraInfo } from "webviz-core/src/types/Messages";

const DISTORTION_STATE = {
  NONE: "NONE",
  CALIBRATED: "CALIBRATED",
};

type DistortionState = $Values<typeof DISTORTION_STATE>;

// Essentially a copy of ROSPinholeCameraModel
// but only the relevant methods, i.e.
// fromCameraInfo() and unrectifyPoint()
// http://docs.ros.org/diamondback/api/image_geometry/html/c++/pinhole__camera__model_8cpp_source.html
export default class PinholeCameraModel {
  _distortionState: DistortionState = DISTORTION_STATE.NONE;
  D: $ReadOnlyArray<number> = [];
  K: $ReadOnlyArray<number> = [];
  P: $ReadOnlyArray<number> = [];
  R: $ReadOnlyArray<number> = [];

  // Mostly copied from `fromCameraInfo`
  // http://docs.ros.org/diamondback/api/image_geometry/html/c++/pinhole__camera__model_8cpp_source.html#l00062
  constructor(info: CameraInfo) {
    const { binning_x, binning_y, roi, distortion_model, D, K, P, R } = info;

    if (distortion_model === "") {
      // Allow CameraInfo with no model to indicate no distortion
      this._distortionState = DISTORTION_STATE.NONE;
      return;
    }

    // Binning = 0 is considered the same as binning = 1 (no binning).
    const binningX = binning_x ? binning_x : 1;
    const binningY = binning_y ? binning_y : 1;

    const adjustBinning = binningX > 1 || binningY > 1;
    const adjustRoi = roi.x_offset !== 0 || roi.y_offset !== 0;

    if (adjustBinning || adjustRoi) {
      throw new Error(
        "Failed to initialize camera model: unable to handle adjusted binning and adjusted roi camera models."
      );
    }

    // See comments about Tx = 0, Ty = 0 in
    // http://docs.ros.org/melodic/api/sensor_msgs/html/msg/CameraInfo.html
    if (P[3] !== 0 || P[7] !== 0) {
      throw new Error(
        "Failed to initialize camera model: projection matrix implies non monocular camera - cannot handle at this time."
      );
    }

    // Figure out how to handle the distortion
    if (distortion_model === "plumb_bob" || distortion_model === "rational_polynomial") {
      this._distortionState = D[0] === 0.0 ? DISTORTION_STATE.NONE : DISTORTION_STATE.CALIBRATED;
    } else {
      throw new Error(
        "Failed to initialize camera model: distortion_model is unknown, only plumb_bob and rational_polynomial are supported."
      );
    }
    this.D = D;
    this.P = P;
    this.R = R;
    this.K = K;
  }

  unrectifyPoint({ x: rectX, y: rectY }: Point): { x: number, y: number } {
    if (this._distortionState === DISTORTION_STATE.NONE) {
      return { x: rectX, y: rectY };
    }

    const { P, R, D, K } = this;
    const fx = P[0];
    const fy = P[5];
    const cx = P[2];
    const cy = P[6];
    const tx = P[3];
    const ty = P[7];

    // Formulae from docs for cv::initUndistortRectifyMap,
    // http://opencv.willowgarage.com/documentation/cpp/camera_calibration_and_3d_reconstruction.html

    // x <- (u - c'x) / f'x
    // y <- (v - c'y) / f'y
    // c'x, f'x, etc. (primed) come from "new camera matrix" P[0:3, 0:3].
    const x1 = (rectX - cx - tx) / fx;
    const y1 = (rectY - cy - ty) / fy;
    // [X Y W]^T <- R^-1 * [x y 1]^T
    const X = R[0] * x1 + R[1] * y1 + R[2];
    const Y = R[3] * x1 + R[4] * y1 + R[5];
    const W = R[6] * x1 + R[7] * y1 + R[8];
    const xp = X / W;
    const yp = Y / W;

    // x'' <- x'(1+k1*r^2+k2*r^4+k3*r^6) + 2p1*x'*y' + p2(r^2+2x'^2)
    // y'' <- y'(1+k1*r^2+k2*r^4+k3*r^6) + p1(r^2+2y'^2) + 2p2*x'*y'
    // where r^2 = x'^2 + y'^2
    const r2 = xp * xp + yp * yp;
    const r4 = r2 * r2;
    const r6 = r4 * r2;
    const a1 = 2 * xp * yp;
    const k1 = D[0];
    const k2 = D[1];
    const p1 = D[2];
    const p2 = D[3];
    const k3 = D[4];
    let barrel_correction = 1 + k1 * r2 + k2 * r4 + k3 * r6;
    if (D.length === 8) {
      barrel_correction /= 1.0 + D[5] * r2 + D[6] * r4 + D[7] * r6;
    }
    const xpp = xp * barrel_correction + p1 * a1 + p2 * (r2 + 2 * (xp * xp));
    const ypp = yp * barrel_correction + p1 * (r2 + 2 * (yp * yp)) + p2 * a1;

    // map_x(u,v) <- x''fx + cx
    // map_y(u,v) <- y''fy + cy
    // cx, fx, etc. come from original camera matrix K.
    return { x: xpp * K[0] + K[2], y: ypp * K[4] + K[5] };
  }
}
