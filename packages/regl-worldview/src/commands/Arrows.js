// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { vec3, quat } from "gl-matrix";
import * as React from "react";

import type { Arrow } from "../types";
import { pointToVec3, vec3ToPoint, orientationToVec4, vec4ToOrientation } from "../utils/commandUtils";
import { nonInstancedGetHitmap } from "../utils/getHitmapDefaults";
import Cones from "./Cones";
import Cylinders from "./Cylinders";

const UNIT_X_VECTOR = Object.freeze([0, 0, 1]);

export default class Arrows extends React.PureComponent<{ children: Arrow[] }> {
  render() {
    const cylinders = [];
    const cones = [];
    for (const marker of this.props.children) {
      let shaftWidthX;
      let shaftWidthY;
      let shaftLength;
      let headWidthX;
      let headWidthY;
      let headLength;

      let basePosition;
      let orientation;
      let dir;
      if (marker.points && marker.points.length === 2) {
        const [start, end] = marker.points;
        basePosition = [start.x, start.y, start.z];
        const tipPosition = [end.x, end.y, end.z];
        const length = vec3.distance(basePosition, tipPosition);

        dir = vec3.subtract([0, 0, 0], tipPosition, basePosition);
        vec3.normalize(dir, dir);
        orientation = quat.rotationTo([0, 0, 0, 0], UNIT_X_VECTOR, dir);

        headWidthX = headWidthY = marker.scale.y;
        headLength = marker.scale.z || length * 0.3;
        shaftWidthX = shaftWidthY = marker.scale.x;
        shaftLength = length - headLength;
      } else {
        basePosition = pointToVec3(marker.pose.position);
        orientation = orientationToVec4(marker.pose.orientation);
        quat.rotateY(orientation, orientation, Math.PI / 2);
        dir = vec3.transformQuat([0, 0, 0], UNIT_X_VECTOR, orientation);

        shaftWidthX = marker.scale.y || 1;
        shaftWidthY = marker.scale.z || 1;
        headWidthX = 2 * shaftWidthX;
        headWidthY = 2 * shaftWidthY;

        // these magic numbers taken from
        // https://github.com/ros-visualization/rviz/blob/57325fa075893de70f234f4676cdd08b411858ff/src/rviz/default_plugin/markers/arrow_marker.cpp#L113
        headLength = 0.23 * (marker.scale.x || 1);
        shaftLength = 0.77 * (marker.scale.x || 1);
      }

      const shaftPosition = vec3.scaleAndAdd([0, 0, 0], basePosition, dir, shaftLength / 2);
      const headPosition = vec3.scaleAndAdd([0, 0, 0], basePosition, dir, shaftLength + headLength / 2);

      cylinders.push({
        interactionData: marker.interactionData,
        scale: { x: shaftWidthX, y: shaftWidthY, z: shaftLength },
        color: marker.color,
        pose: {
          position: vec3ToPoint(shaftPosition),
          orientation: vec4ToOrientation(orientation),
        },
      });
      cones.push({
        interactionData: marker.interactionData,
        scale: { x: headWidthX, y: headWidthY, z: headLength },
        color: marker.color,
        pose: {
          position: vec3ToPoint(headPosition),
          orientation: vec4ToOrientation(orientation),
        },
      });
    }
    return (
      <React.Fragment>
        <Cylinders getHitmap={nonInstancedGetHitmap}>{cylinders}</Cylinders>
        <Cones getHitmap={nonInstancedGetHitmap}>{cones}</Cones>
      </React.Fragment>
    );
  }
}
