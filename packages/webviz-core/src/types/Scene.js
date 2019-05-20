// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type {
  Pose,
  ArrowMarker,
  CubeMarker,
  SphereMarker,
  CylinderMarker,
  LineStripMarker,
  LineListMarker,
  CubeListMarker,
  SphereListMarker,
  PointsMarker,
  TextMarker,
  TriangleListMarker,
  FilledPolygonMarker,
  // non-default types
  OccupancyGridMessage,
  PointCloud,
  LaserScan,
} from "webviz-core/src/types/Messages";
import Bounds from "webviz-core/src/util/Bounds";

export type Scene = {|
  flattenedZHeightPose: ?Pose,
  bounds: Bounds,
|};

export interface MarkerCollector {
  arrow(ArrowMarker): any;
  cube(CubeMarker): any;
  cubeList(CubeListMarker): any;
  sphere(SphereMarker): any;
  sphereList(SphereListMarker): any;
  cylinder(CylinderMarker): any;
  lineStrip(LineStripMarker): any;
  lineList(LineListMarker): any;
  points(PointsMarker): any;
  text(TextMarker): any;
  triangleList(TriangleListMarker): any;
  grid(OccupancyGridMessage): any;
  pointcloud(PointCloud): any;
  laserScan(LaserScan): any;
  filledPolygon(FilledPolygonMarker): any;
}

export interface MarkerProvider {
  renderMarkers(add: MarkerCollector): void;
}
