// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// All message types supported by Rviz
// http://wiki.ros.org/rviz/DisplayTypes

import type { Time } from "rosbag";

export type Namespace = $ReadOnly<{|
  topic: string,
  name: string,
|}>;

export type MutablePoint = {|
  x: number,
  y: number,
  z: number,
|};
export type Point = $ReadOnly<MutablePoint>;
export type Vector3 = Point;
type Points = $ReadOnlyArray<Point>;

export type Header = $ReadOnly<{|
  frame_id: string,
  stamp: Time,
  // TODO(steel): Make seq required.
  seq?: number,
|}>;

export type StampedMessage = $ReadOnly<{
  header: Header,
}>;

opaque type Duration = Time;

type MutableOrientation = {|
  x: number,
  y: number,
  z: number,
  w: number,
|};
export type Orientation = $ReadOnly<MutableOrientation>;

export type Scale = $ReadOnly<{|
  x: number,
  y: number,
  z: number,
|}>;

export type Color = $ReadOnly<{|
  r: number,
  g: number,
  b: number,
  a: number,
|}>;

export type Pose = $ReadOnly<{|
  position: Point,
  orientation: Orientation,
|}>;

// NOTE: Deep mutability.
export type MutablePose = {|
  position: MutablePoint,
  orientation: MutableOrientation,
|};

export type Pose2D = $ReadOnly<{|
  x: number,
  y: number,
  theta: number,
|}>;

export type Polygon = $ReadOnly<{|
  points: Points,
|}>;

export type LaserScan = $ReadOnly<{|
  header: Header,
  angle_increment: number,
  angle_max: number,
  angle_min: number,
  intensities: $ReadOnlyArray<number>,
  range_max: number,
  range_min: number,
  ranges: $ReadOnlyArray<number>,
  scan_time?: number,
  time_increment?: number,
|}>;

export type PoseStamped = $ReadOnly<
  StampedMessage & {
    pose: Pose,
  }
>;

type Colors = $ReadOnlyArray<Color>;

// Markers
export type BaseMarker = $ReadOnly<
  StampedMessage & {
    ns: string,
    id: string,
    action: 0 | 1 | 2 | 3,
    pose: Pose,
    scale: Scale,
    color?: Color,
    colors?: Colors,
    lifetime?: Time, // TODO: required
    frame_locked?: boolean, // TODO: required
    text?: string,
    mesh_resource?: string, // TODO: required
    primitive?: string,
    metadata?: $ReadOnly<any>,
  }
>;

type MultiPointMarker = $ReadOnly<{
  points: Points,
  colors?: Colors,
}>;

type ArrowSize = $ReadOnly<{|
  shaftWidth: number,
  headLength: number,
  headWidth: number,
|}>;

// TODO: Is this correct?
export type ArrowMarker = $ReadOnly<
  BaseMarker & {
    type: 0,
    points?: Points,
    // used for hard-coded arrows with geometry_msgs/PoseStamped
    // not part of the original ros message
    size?: ArrowSize,
  }
>;

export type CubeMarker = $ReadOnly<
  BaseMarker & {
    type: 1,
  }
>;

export type SphereMarker = $ReadOnly<
  BaseMarker & {
    type: 2,
  }
>;

export type CylinderMarker = $ReadOnly<
  BaseMarker & {
    type: 3,
  }
>;

export type LineStripMarker = $ReadOnly<
  BaseMarker &
    MultiPointMarker & {
      closed?: boolean,
      type: 4,
    }
>;

export type LineListMarker = $ReadOnly<
  BaseMarker &
    MultiPointMarker & {
      type: 5,
    }
>;

export type CubeListMarker = $ReadOnly<
  BaseMarker &
    MultiPointMarker & {
      type: 6,
    }
>;

export type SphereListMarker = $ReadOnly<
  BaseMarker &
    MultiPointMarker & {
      type: 7,
    }
>;

export type PointsMarker = $ReadOnly<
  BaseMarker &
    MultiPointMarker & {
      type: 8,
    }
>;

export type TextMarker = $ReadOnly<
  BaseMarker & {
    type: 9,
    text: string,
  }
>;

export type MeshMarker = $ReadOnly<
  BaseMarker &
    MultiPointMarker & {
      type: 11,
    }
>;

type NavMsgs$MapMetaData = $ReadOnly<{|
  map_load_time: Time,
  resolution: number,
  width: number,
  height: number,
  origin: Pose,
|}>;

export type NavMsgs$OccupancyGrid = $ReadOnly<{|
  header: Header,
  info: NavMsgs$MapMetaData,
  data: $ReadOnlyArray<number>,
|}>;

export type OccupancyGridMessage = $ReadOnly<{|
  name: string,
  type: 101,
  map: "map" | "costmap",
  alpha: number,
  info: NavMsgs$MapMetaData,
  data: $ReadOnlyArray<number>,
|}>;

export type TriangleListMarker = $ReadOnly<
  BaseMarker &
    MultiPointMarker & {
      type: 11,
    }
>;

export type FilledPolygonMarker = $ReadOnly<
  BaseMarker &
    MultiPointMarker & {
      type: 107,
    }
>;

export type InstancedLineListMarker = $ReadOnly<
  BaseMarker &
    MultiPointMarker & {
      type: 108,
      metadataByIndex?: $ReadOnlyArray<$ReadOnly<any>>,
    }
>;

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
  | FilledPolygonMarker
  | InstancedLineListMarker;

export type MarkerArray = $ReadOnly<{|
  markers: $ReadOnlyArray<Marker>,
  // TODO(steel): Fix this. MarkerArrays have no header, except when they sometimes do.
  header?: Header,
|}>;

type ChannelFloat = $ReadOnly<{|
  name: string,
  values: $ReadOnlyArray<number>,
|}>;

type PointCloud1 = $ReadOnly<
  StampedMessage & {
    points: Points,
    channels: $ReadOnlyArray<ChannelFloat>,
    type: "PointCloud1",
  }
>;

export type PointField = $ReadOnly<{|
  name: string,
  offset: number,
  datatype: number,
  count: number,
|}>;

export type PointCloud2 = $ReadOnly<
  StampedMessage & {
    fields: $ReadOnlyArray<PointField>,
    height: number,
    width: number,
    is_bigendian: boolean,
    point_step: number, // Length of point in bytes
    row_step: number, // Length of row in bytes
    // TODO(steel): Figure out how to make data read-only in flow.
    data: Uint8Array,
    is_dense: number,
    // this is appended by scene builder
    type: 102 | "PointCloud2",
    // this is appended by scene builder
    pose: ?Pose,
  }
>;

export type PointCloud = PointCloud1 | PointCloud2;

type Transform = $ReadOnly<{|
  rotation: Orientation,
  translation: Point,
|}>;

export type TF = $ReadOnly<
  StampedMessage & {
    transform: Transform,
    child_frame_id: string,
  }
>;

export type ImageMarker = $ReadOnly<{|
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
  points: Points,
  outline_colors: Colors,
  text: { data: string },
  thickness: number,
|}>;

type Roi = $ReadOnly<{|
  x_offset: number,
  y_offset: number,
  height: number,
  width: number,
  do_rectify: false,
|}>;

type DistortionModel = "plumb_bob" | "rational_polynomial";

export type CameraInfo = $ReadOnly<{|
  width: number,
  height: number,
  binning_x: number,
  binning_y: number,
  roi: Roi,
  distortion_model: DistortionModel,
  D: $ReadOnlyArray<number>,
  K: $ReadOnlyArray<number>,
  P: $ReadOnlyArray<number>,
  R: $ReadOnlyArray<number>,
|}>;

export type MapMetaData = $ReadOnly<{|
  map_load_time: Time,
  resolution: number,
  width: number,
  height: number,
  origin: Pose,
|}>;
