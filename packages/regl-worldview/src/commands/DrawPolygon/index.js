// @flow

//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// TODO(Audrey): add documentation for DrawPolygons
import React from "react";

import type { Line, Point, Pose, Vec4, Vec3, Scale, GetHitmap } from "../../types";
import { vec4ToRGBA, vec3ToPoint } from "../../utils/commandUtils";
import { nonInstancedGetHitmap } from "../../utils/getHitmapDefaults";
import Lines from "../Lines";
import Spheres from "../Spheres";

export function multiplyScale(scale: Scale, factor: number): Scale {
  return { x: scale.x * factor, y: scale.y * factor, z: scale.z * factor };
}

export const DEFAULT_COLOR = [1, 1, 1, 1];
export const ACTIVE_POLYGON_COLOR = [0.8, 0, 0.8, 1];
export const ACTIVE_POINT_COLOR = [1, 0.2, 1, 1];
export const LINE_STRIP = "line strip";
const POINT_SIZE_FACTOR = 1.3;
export const DRAW_SCALE = { x: 0.1, y: 0.1, z: 0.1 };
export const DRAW_POINT_SCALE = multiplyScale(DRAW_SCALE, POINT_SIZE_FACTOR);
export const HITMAP_SCALE = { x: 0.5, y: 0.5, z: 0.5 };
export const HITMAP_POINT_SCALE = multiplyScale(HITMAP_SCALE, POINT_SIZE_FACTOR);
export const POSE = {
  position: { x: 0, y: 0, z: 0 },
  orientation: { x: 0, y: 0, z: 0, w: 0 },
};

let count = 1;

export class PolygonPoint {
  id: number;
  point: Vec3;
  active: boolean = false;

  constructor(points: Vec3) {
    this.id = count++;
    this.point = points;
  }
}

export class Polygon {
  id: number;
  name: string;
  points: PolygonPoint[] = [];
  active: boolean = false;

  constructor(name: string = "") {
    this.name = name;
    this.id = count++;
  }
}

export type DrawPolygonType = Polygon;

type DrawPolygonSphere = {
  points: Point[],
  pose: Pose,
  scale: Scale,
  colors: Vec4[],
};

type Props = {
  children: DrawPolygonType[],
};

const polygonLinesGetHitmap: GetHitmap = <T: any>(props: T, assignNextIds, seenObjects) => {
  const hitmapProps = nonInstancedGetHitmap(props, assignNextIds, seenObjects) || [];
  for (const prop of hitmapProps) {
    prop.scale = HITMAP_SCALE;
  }
  return hitmapProps;
};

/**
 * Draw the polygon lines
 */
class PolygonLines extends React.Component<Props> {
  render() {
    const polygons = this.props.children;
    const lines: Line[] = [];
    for (const poly of polygons) {
      const color = poly.active ? ACTIVE_POLYGON_COLOR : DEFAULT_COLOR;
      const points: Point[] = poly.points.map(({ point }) => vec3ToPoint(point));

      lines.push({
        primitive: LINE_STRIP,
        pose: POSE,
        points,
        scale: DRAW_SCALE,
        color: vec4ToRGBA(color),
      });
    }

    return <Lines getHitmap={polygonLinesGetHitmap}>{lines}</Lines>;
  }
}

const polygonPointsGetHitmap: GetHitmap = <T: any>(props: T, assignNextIds, seenObjects) => {
  const hitmapProps = nonInstancedGetHitmap(props, assignNextIds, seenObjects) || [];
  for (const prop of hitmapProps) {
    prop.scale = HITMAP_POINT_SCALE;
  }
  return hitmapProps;
};

/**
 * Draw the polygon points at the end of each lines
 */
class PolygonPoints extends React.Component<Props> {
  render() {
    const polygons = this.props.children;
    const sphereList: DrawPolygonSphere = {
      points: [],
      colors: [],
      pose: POSE,
      scale: DRAW_POINT_SCALE,
    };

    for (const poly of polygons) {
      const color = poly.active ? ACTIVE_POLYGON_COLOR : DEFAULT_COLOR;
      for (const point of poly.points) {
        const convertedPoint = vec3ToPoint(point.point);
        sphereList.points.push(convertedPoint);
        sphereList.colors.push(point.active ? ACTIVE_POINT_COLOR : color);
      }
    }

    return <Spheres getHitmap={polygonPointsGetHitmap}>{sphereList}</Spheres>;
  }
}

export default function DrawPolygons({ children: polygons = [] }: Props) {
  if (polygons.length === 0) {
    return null;
  }

  return (
    <React.Fragment>
      <PolygonLines>{polygons}</PolygonLines>
      <PolygonPoints>{polygons}</PolygonPoints>
    </React.Fragment>
  );
}
