// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import earcut from "earcut";
import React from "react";

import type { Vec3, PolygonType } from "../types";
import { shouldConvert, pointToVec3 } from "../utils/commandUtils";
import { getHitmapPropsForFilledPolygons, getObjectFromHitmapIdForFilledPolygons } from "../utils/hitmapDefaults";
import type { GetHitmapProps, GetObjectFromHitmapId } from "./Command";
import Triangles from "./Triangles";

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
  // TODO: deprecating getHitmapId, remove before 1.x release
  getHitmapId?: (PolygonType) => number,
  getHitmapProps: GetHitmapProps<PolygonType>,
  getObjectFromHitmapId: GetObjectFromHitmapId<PolygonType>,
};

// command to draw a filled polygon
function FilledPolygons({ children: polygons = [], getHitmapProps, getObjectFromHitmapId, ...rest }: Props) {
  const triangles = [];
  for (const poly of polygons) {
    // $FlowFixMe flow doesn't know how shouldConvert works
    const points: Vec3[] = shouldConvert(poly.points) ? poly.points.map(pointToVec3) : poly.points;
    const pose = poly.pose ? poly.pose : NO_POSE;
    const earcutPoints: Vec3[] = getEarcutPoints(points);
    triangles.push({
      ...poly,
      points: earcutPoints,
      pose,
      scale: DEFAULT_SCALE,
    });
  }
  return (
    <Triangles getHitmapProps={getHitmapProps} getObjectFromHitmapId={getObjectFromHitmapId} {...rest}>
      {triangles}
    </Triangles>
  );
}

FilledPolygons.defaultProps = {
  getHitmapProps: getHitmapPropsForFilledPolygons,
  getObjectFromHitmapId: getObjectFromHitmapIdForFilledPolygons,
};

export default FilledPolygons;
