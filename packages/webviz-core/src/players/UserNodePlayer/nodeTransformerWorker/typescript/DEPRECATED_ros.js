// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const DEPRECATED__ros_lib_filename = "DEPRECATED__ros/index.d.ts";
export const DEPRECATED__ros_lib_dts = `
export declare type RGBA = { // all values are scaled between 0-1 instead of 0-255
  r: number,
  g: number,
  b: number,
  a: number // opacity -- typically you should set this to 1.
};

export declare type Time = {
  sec: number,
  nsec: number
}

export declare type Message<T> = {
  topic: string,
  receiveTime: Time,
  message: T,
}

export declare type Header = {
  frame_id: string,
  stamp: Time,
};

export declare type Point = {
  x: number,
  y: number,
  z: number
};

export declare type Scale = {
  x: number,
  y: number,
  z: number
};

export declare type Orientation = {
  x: number,
  y: number,
  z: number,
  w: number
};

export declare type Pose = {
  position: Point,
  orientation: Orientation
};

/**
 * For publishing markers, every other marker is built up on this base type.
 * The 'id' property has to be unique, as duplicate ids will cause markers to
 * be overwritten. The 'ns' property corresponds to namespace under which your
 * marker is published. In most cases, you will just want to set the 'action'
 * property to '0'.
  */
export declare type BaseMarker = {
  header: Header,
  ns: string, // namespace that your marker is published under.
  id: string | number, // IMPORTANT: Needs to be unique. Duplicate ids will overwrite other markers.
  action: 0 | 1 | 2 | 3, // In most cases, you will want to use '0' here.
  pose: Pose,
  scale: Scale,
  color?: RGBA,
  metadata?: { [key: string]: any }
};

/**
 * When publishing markers with a 'points' array, the 'color' field takes 1 RGBA object to apply to all points,
 * while the 'colors' field takes in an array of RGBA objects to apply to each point. When both are present,
 * the 'colors' field overrides the 'color' field.
  */
export declare type MultiPointMarker = BaseMarker & {
  points: Point[]
  colors?: RGBA[]
};

/**
 * When publishing markers with a 'points' array, the 'color' field takes 1 RGBA object to apply to all points,
 * while the 'colors' field takes in an array of RGBA objects to apply to each point. When both are present,
 * the 'colors' field overrides the 'color' field.
  */
export declare type ArrowMarker = BaseMarker & {
  type: 0,
  points?: Point[],
  size?: ArrowSize,
}

export declare type ArrowSize = {
  shaftWidth: number,
  headLength: number,
  headWidth: number
};

export declare type CubeMarker = BaseMarker & {
  type: 1
};

export declare type CubeListMarker = MultiPointMarker & {
  type: 6
};

export declare type SphereMarker = BaseMarker & {
  type: 2
};

export declare type SphereListMarker = MultiPointMarker & {
  type: 7
};

export declare type CylinderMarker = BaseMarker & {
  type: 3
};

export declare type LineStripMarker = MultiPointMarker & {
  type: 4
};

export declare type LineListMarker = MultiPointMarker & {
  type: 5
};

export declare type PointsMarker = MultiPointMarker & {
  type: 8
};

export declare type TextMarker = BaseMarker & {
  type: 9,
  text: string
};

export declare type TriangleListMarker = MultiPointMarker & {
  type: 11
};

export declare type MeshMarker = MultiPointMarker & {
  type: 10
};

export declare type FilledPolygonMarker = MultiPointMarker & {
  type: 107
};
`;
