// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// All message types supported by Rviz
// http://wiki.ros.org/rviz/DisplayTypes

import type { Time } from "rosbag";

export type Point = {
  x: number,
  y: number,
  z: number,
};
type Points = Array<Point>;

export type Header = {
  frame_id: string,
  stamp: Time,
};

export type StampedMessage = {
  header: Header,
};

opaque type Duration = Time;

export type Orientation = {
  x: number,
  y: number,
  z: number,
  w: number,
};

type Scale = {
  x: number,
  y: number,
  z: number,
};

export type Color = {
  r: number,
  g: number,
  b: number,
  a: number,
};

type Colors = Color[];

export type Pose = {
  position: Point,
  orientation: Orientation,
};

export type Pose2D = {
  x: number,
  y: number,
  theta: number,
};
export type Polygon = {
  points: Point[],
};

export type LaserScan = {
  angle_increment: number,
  angle_max: number,
  angle_min: number,
  intensities: number[],
  range_max: number,
  range_min: number,
  ranges: number[],
  scan_time?: number,
  time_increment?: number,
};

export type PoseStamped = StampedMessage & {
  pose: Pose,
};

// Markers
export type BaseMarker = StampedMessage & {
  // Need to add hitmapId field to avoid flow errors: https://github.com/facebook/flow/issues/5997
  hitmapId?: number,
  ns: string,
  id: string,
  action: 0 | 1 | 2 | 3,
  pose: Pose,
  name?: string,
  scale: Scale,
  color: Color,
  lifetime?: Time,
  frameLocked?: boolean, // TODO: Do we need this?
  text?: string,
  meshResource?: {}, // TODO Maybe make this a named resource?
  primitive?: string,
  customMetadata?: Object,
};

type MultiPointMarker = {
  points: Points,
  colors?: Colors,
};

type ArrowSize = {
  shaftWidth: number,
  headLength: number,
  headWidth: number,
};

// TODO: Is this correct?
export type ArrowMarker = BaseMarker & {
  type: 0,
  points?: Points,
  // used for hard-coded arrows with geometry_msgs/PoseStamped
  // not part of the original ros message
  size?: ArrowSize,
};

export type CubeMarker = BaseMarker & {
  type: 1,
};

export type SphereMarker = BaseMarker & {
  type: 2,
};

export type CylinderMarker = BaseMarker & {
  type: 3,
};

export type LineStripMarker = BaseMarker &
  MultiPointMarker & {
    type: 4,
  };

export type LineListMarker = BaseMarker &
  MultiPointMarker & {
    type: 5,
  };

export type CubeListMarker = BaseMarker &
  MultiPointMarker & {
    type: 6,
  };

export type SphereListMarker = BaseMarker &
  MultiPointMarker & {
    type: 7,
  };

export type PointsMarker = BaseMarker &
  MultiPointMarker & {
    type: 8,
  };

export type TextMarker = BaseMarker & {
  type: 9,
  text: string,
};

export type MeshMarker = BaseMarker &
  MultiPointMarker & {
    type: 11,
  };

type OccupancyGridInfo = {
  map_load_time: Time,
  resolution: number,
  width: number,
  height: number,
  origin: Pose,
};

export type OccupancyGridMessage = {
  type: 101,
  name: string,
  header: Header,
  info: OccupancyGridInfo,
  data: number[],
  map: "map" | "costmap",
  alpha?: number,
};

export type TriangleListMarker = BaseMarker &
  MultiPointMarker & {
    type: 11,
  };

export type FilledPolygonMarker = BaseMarker &
  MultiPointMarker & {
    type: 107,
  };

export type Marker =
  | ArrowMarker
  | CubeMarker
  | CubeListMarker
  | SphereMarker
  | SphereListMarker
  | CylinderMarker
  | LineStripMarker
  | LineListMarker
  | CubeListMarker
  | PointsMarker
  | TextMarker
  | TriangleListMarker
  | MeshMarker
  | FilledPolygonMarker;

export type MarkerArray = {
  markers: Array<Marker>,
};

type ChannelFloat = {
  name: string,
  values: Array<number>,
};

type PointCloud1 = StampedMessage & {
  points: Points,
  channels: Array<ChannelFloat>,
  type: "PointCloud1",
};

export type PointCloud2Field = {
  name: string,
  offset: number,
  datatype: number,
  count: number,
};

export type PointCloud2 = StampedMessage & {
  fields: PointCloud2Field[],
  height: number,
  width: number,
  is_bigendian: number, // TODO: Do we need this?
  point_step: number, // Length of point in bytes
  row_step: number, // Length of row in bytes
  data: number[],
  is_dense: number,
  // this is appended by scene builder
  type: 102 | "PointCloud2",
  // this is appended by scene builder
  pose: ?Pose,
  // this is appended by scene builder
  name: ?string,
  colorField?: string,
  pointSize?: number,
  color?: string,
};

export type PointCloud = PointCloud1 | PointCloud2;

type Transform = {
  rotation: Orientation,
  translation: Point,
};

export type TF = StampedMessage & {
  transform: Transform,
  child_frame_id: string,
};

export type ImageMarker = {
  header: Header,
  ns: string,
  id: number,
  type: 0 | 1 | 2 | 3 | 4 | 5,
  action: 0 | 1,
  position: Point,
  scale: number,
  outline_color: Color,
  filled: boolean,
  fill_color: Color,
  lifetime: Duration,
  points: Point[],
  outline_colors: Color[],
  text: { data: string },
  thickness: number,
};

type Roi = {
  x_offset: number,
  y_offset: number,
  height: number,
  width: number,
  do_rectify: false,
};

type DistortionModel = "plumb_bob" | "rational_polynomial";

export type CameraInfo = {
  width: number,
  height: number,
  binning_x: number,
  binning_y: number,
  roi: Roi,
  distortion_model: DistortionModel,
  D: number[],
  K: number[],
  P: number[],
  R: number[],
};

export type MapMetaData = {
  map_load_time: Time,
  resolution: number,
  width: number,
  height: number,
  origin: Pose,
};
