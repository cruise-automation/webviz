//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// @flow
import React from 'react';
import Lines from './Lines';
import type { Pose, Color, Scale, Point, Vec3 } from '../types';

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
  scale: { x: 1, y: 1, z: 1 },
  color: { r: 1, g: 0, b: 0, a: 1 },
};
const yAxis = {
  pose,
  points: yAxisPoints,
  scale: { x: 1, y: 1, z: 1 },
  color: { r: 0, g: 1, b: 0, a: 1 },
};
const zAxis = {
  pose,
  points: zAxisPoints,
  scale: { x: 1, y: 1, z: 1 },
  color: { r: 0, g: 0, b: 1, a: 1 },
};

type Axis = {
  hitmapId?: number,
  pose: Pose,
  points: Point[],
  scale: Scale,
  color: Color,
};

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
