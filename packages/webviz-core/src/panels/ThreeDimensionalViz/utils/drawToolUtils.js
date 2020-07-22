// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Polygon, PolygonPoint } from "regl-worldview";

import { EDIT_FORMAT, type EditFormat } from "webviz-core/src/components/ValidatedInput";
import { type Point2D } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools";
import YAML from "webviz-core/src/util/yaml";

export function polygonsToPoints(polygons: Polygon[]): Point2D[][] {
  return polygons.map((poly) => {
    return poly.points.map((point) => ({ x: point.point[0], y: point.point[1] }));
  });
}

export function pointsToPolygons(polygonPoints: Point2D[][]): Polygon[] {
  // map the points back to polygons
  return polygonPoints.map((pointsPerPolygon, idx) => {
    const polygon = new Polygon(`${idx}`);
    polygon.points = pointsPerPolygon.map(({ x, y }) => new PolygonPoint([x, y, 0]));
    return polygon;
  });
}

function pointsToYaml(polygonPoints: Point2D[][]): string {
  if (!polygonPoints.length || !polygonPoints[0].length) {
    return "";
  }
  return YAML.stringify(polygonPoints);
}

function pointsToJson(polygonPoints: Point2D[][]): string {
  return JSON.stringify(polygonPoints, null, 2);
}

export function getFormattedString(polygonPoints: Point2D[][], selectedPolygonEditFormat: EditFormat) {
  return selectedPolygonEditFormat === EDIT_FORMAT.JSON ? pointsToJson(polygonPoints) : pointsToYaml(polygonPoints);
}

// calculate the sum of the line distances
export function getPolygonLineDistances(polygonPoints: Point2D[][]): number {
  return polygonPoints.reduce((memo, polyPoints) => {
    if (polyPoints.length > 1) {
      for (let i = 0; i < polyPoints.length - 1; i++) {
        memo += Math.hypot(polyPoints[i + 1].x - polyPoints[i].x, polyPoints[i + 1].y - polyPoints[i].y);
      }
    }
    return memo;
  }, 0);
}
