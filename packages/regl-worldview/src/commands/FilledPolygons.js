//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// @flow
import React from 'react';
import earcut from 'earcut';
import type { Vec3, Point, PolygonType, TriangleList } from '../types';
import Triangles from './Triangles';

const NO_POSE = {
  position: { x: 0, y: 0, z: 0 },
  orientation: { x: 0, y: 0, z: 0, w: 0 },
};

const DEFAULT_SCALE = { x: 1, y: 1, z: 1 };

function flatten3D(points: Vec3[]): Float32Array {
  const array = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i];
    array[i * 3] = x;
    array[i * 3 + 1] = y;
    array[i * 3 + 2] = z;
  }
  return array;
}

function getEarcutPoints(points: Vec3[]): Vec3[] {
  const flattenedPoints = flatten3D(points);
  const indices = earcut(flattenedPoints, null, 3);
  const newPoints = [];
  for (let i = 0; i < indices.length; i++) {
    const originalIndex = indices[i];
    newPoints.push(points[originalIndex]);
  }
  return newPoints;
}

type Props = {
  children: PolygonType[],
  getHitmapId?: (TriangleList) => number,
};

// command to draw a filled polygon
export default function FilledPolygons({ children: polygons = [], getHitmapId }: Props) {
  const triangles = [];
  for (const poly of polygons) {
    const { points } = poly;
    const pose = poly.pose ? poly.pose : NO_POSE;
    const earcutPoints: Vec3[] = getEarcutPoints(points);
    const polyPoints: Point[] = earcutPoints.map(([x, y, z]) => ({ x, y, z }));
    const color = poly.color;
    triangles.push({
      points: polyPoints,
      pose: pose,
      color: { r: color[0], g: color[1], b: color[2], a: color[3] },
      scale: DEFAULT_SCALE,
    });
  }

  return <Triangles getHitmapId={getHitmapId}>{triangles}</Triangles>;
}
