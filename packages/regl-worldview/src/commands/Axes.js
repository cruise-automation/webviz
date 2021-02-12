// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import type { Point, Vec3, Line } from "../types";
import Lines from "./Lines";

const pointToVec3 = (p: Vec3): Point => ({
  x: p[0],
  y: p[1],
  z: p[2],
});

const scale = 100;
const x = 1 * scale;
const xAxisPoints = [[-x, 0, 0], [x, 0, 0]].map(pointToVec3);
const yAxisPoints = [[0, -100, 0], [0, 100, 0]].map(pointToVec3);
const zAxisPoints = [[0, 0, -100], [0, 0, 100]].map(pointToVec3);
const pose = {
  orientation: { x: 0, y: 0, z: 0, w: 0 },
  position: { x: 0, y: 0, z: 0 },
};
const xAxis = {
  pose,
  points: xAxisPoints,
  scale: { x: 0.5, y: 0.5, z: 0.5 },
  color: { r: 0.95, g: 0.26, b: 0.4, a: 1 },
};
const yAxis = {
  pose,
  points: yAxisPoints,
  scale: { x: 0.5, y: 0.5, z: 0.5 },
  color: { r: 0.02, g: 0.82, b: 0.49, a: 1 },
};
const zAxis = {
  pose,
  points: zAxisPoints,
  scale: { x: 0.5, y: 0.5, z: 0.5 },
  color: { r: 0.11, g: 0.51, b: 0.92, a: 1 },
};

type Axis = Line;

type Props = {
  children: Axis[],
};

// Renders lines along the x, y, and z axes; useful for debugging.
export default class Axes extends React.Component<Props> {
  static defaultProps: Props = {
    children: [xAxis, yAxis, zAxis],
  };

  render() {
    return <Lines>{this.props.children}</Lines>;
  }
}
