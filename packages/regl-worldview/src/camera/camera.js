// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mat4 } from "gl-matrix";

import type { Vec3, Mat4, CameraCommand, Viewport } from "../types";
import getOrthographicBounds from "../utils/getOrthographicBounds";
import project from "./cameraProject";
import { selectors, DEFAULT_CAMERA_STATE, type CameraState } from "./CameraStore";

const TEMP_MAT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

// This is the regl command which encapsulates the camera projection and view matrices.
// It adds the matrices to the regl context so they can be used by other commands.
export default (regl: any) => {
  return class Camera implements CameraCommand {
    viewportWidth: number = 0;
    viewportHeight: number = 0;
    cameraState: CameraState = DEFAULT_CAMERA_STATE;

    getProjection(): Mat4 {
      const { near, far, distance, fovy } = this.cameraState;
      if (!this.cameraState.perspective) {
        const bounds = getOrthographicBounds(distance, this.viewportWidth, this.viewportHeight);
        const { left, right, bottom, top } = bounds;
        return mat4.ortho([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], left, right, bottom, top, near, far);
      }
      const aspect = this.viewportWidth / this.viewportHeight;
      return mat4.perspective([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], fovy, aspect, near, far);
    }

    getView(): Mat4 {
      return selectors.view(this.cameraState);
    }

    // convert a point in 3D space to a point on the screen
    toScreenCoord(viewport: Viewport, point: Vec3) {
      const projection = this.getProjection();
      const view = selectors.view(this.cameraState);
      const combinedProjView = mat4.multiply(TEMP_MAT, projection, view);
      const [x, y, z, w] = project([], point, viewport, combinedProjView);
      if (z < 0 || z > 1 || w < 0) {
        // resulting point is outside the window depth range
        return undefined;
      }
      const diffY = viewport[3] + viewport[1];
      const diffX = viewport[0];
      // move the x value over based on the left of the viewport
      // and move the y value over based on the bottom of the viewport
      return [x - diffX, diffY - y, z];
    }

    draw = regl({
      // adds context variables to the regl context so they are accessible from commands
      context: {
        // use functions, not lambdas here to make sure we can access
        // the regl supplied this scope: http://regl.party/api#this
        projection(context, props) {
          const { viewportWidth, viewportHeight } = context;
          // save these variables on the camera instance
          // because we need them for raycasting
          this.viewportWidth = viewportWidth;
          this.viewportHeight = viewportHeight;
          this.cameraState = props;
          return this.getProjection();
        },

        view(context, props) {
          return this.getView();
        },

        // inverse of the view rotation, used for making objects always face the camera
        billboardRotation(context, props) {
          return selectors.billboardRotation(this.cameraState);
        },

        isPerspective(context, props) {
          return this.cameraState.perspective;
        },

        fovy(context, props) {
          return this.cameraState.fovy;
        },
      },

      // adds view and projection as uniforms to every command
      // and makes them available in the shaders
      uniforms: {
        view: regl.context("view"),
        billboardRotation: regl.context("billboardRotation"),
        projection: regl.context("projection"),
      },
    });
  };
};
