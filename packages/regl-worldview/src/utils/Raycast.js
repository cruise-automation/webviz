// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { vec3, mat4 } from "gl-matrix";

import type { CameraCommand, Vec3 } from "../types";

type ClickInfo = { clientX: number, clientY: number, width: number, height: number };

const tempVec = [0, 0, 0];
const tempMat = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export class Ray {
  origin: Vec3;
  dir: Vec3;
  point: Vec3;

  constructor(origin: Vec3, dir: Vec3, point: Vec3) {
    this.origin = origin;
    this.dir = dir;
    this.point = point;
  }

  distanceToPoint(point: Vec3) {
    return vec3.distance(this.origin, point);
  }

  // https://commons.apache.org/proper/commons-math/javadocs/api-3.6/src-html/org/apache/commons/math3/geometry/euclidean/threed/Plane.html#line.394
  planeIntersection(planeCoordinate: Vec3, planeNormal: Vec3): ?Vec3 {
    const d = vec3.dot(planeNormal, planeCoordinate);
    const cosine = vec3.dot(planeNormal, this.dir);

    if (cosine === 0) {
      return null;
    }

    const x = (d - vec3.dot(planeNormal, this.origin)) / cosine;
    const contact = vec3.add([0, 0, 0], this.origin, vec3.scale(tempVec, this.dir, x));
    return contact;
  }
}

// adapted from https://github.com/regl-project/regl/blob/master/example/raycast.js
export function getRayFromClick(camera: CameraCommand, { clientX, clientY, width, height }: ClickInfo) {
  const projectionMatrix = camera.getProjection();
  const viewMatrix = camera.getView();

  const vp = mat4.multiply(tempMat, projectionMatrix, viewMatrix);
  const invVp = mat4.invert(tempMat, vp);

  const mouseX = (2.0 * clientX) / width - 1.0;
  const mouseY = (-2.0 * clientY) / height + 1.0;
  // get a single point on the camera ray.
  const rayPoint = vec3.transformMat4([0, 0, 0], [mouseX, mouseY, 0.0], invVp);

  // get the position of the camera.
  const rayOrigin = vec3.transformMat4([0, 0, 0], [0, 0, 0], mat4.invert(tempMat, viewMatrix));
  const rayDir = vec3.normalize([0, 0, 0], vec3.subtract(tempVec, rayPoint, rayOrigin));

  return new Ray(rayOrigin, rayDir, rayPoint);
}
