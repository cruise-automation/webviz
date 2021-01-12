// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// All message types supported by Rviz
// http://wiki.ros.org/rviz/DisplayTypes

import type { ArrayView } from "webviz-core/src/util/binaryObjects";

export type BinaryTime = $ReadOnly<{|
  sec(): number,
  nsec(): number,
|}>;

export type BinaryHeader = $ReadOnly<{|
  seq(): number,
  stamp(): BinaryTime,
  frame_id(): string,
|}>;

export type BinaryPoint = {|
  x(): number,
  y(): number,
  z(): number,
|};

export type BinaryStampedMessage = $ReadOnly<{
  header(): BinaryHeader,
}>;

type Orientation = {|
  x(): number,
  y(): number,
  z(): number,
  w(): number,
|};

export type BinaryPose = $ReadOnly<{|
  position(): BinaryPoint,
  orientation(): Orientation,
|}>;

export type BinaryPose2D = $ReadOnly<{|
  x(): number,
  y(): number,
  theta(): number,
|}>;

export type BinaryPoseStamped = $ReadOnly<BinaryStampedMessage & {| pose(): BinaryPose |}>;

export type BinaryPolygon = $ReadOnly<{| points(): ArrayView<BinaryPoint> |}>;
export type BinaryPolygonStamped = $ReadOnly<BinaryStampedMessage & {| polygon(): BinaryPolygon |}>;

export type BinaryColorRgba = $ReadOnly<{|
  r(): number,
  g(): number,
  b(): number,
  a(): number,
|}>;

export type BinaryMarker = $ReadOnly<{|
  header(): BinaryHeader,
  ns(): string,
  id(): number,
  type(): number,
  action(): 0 | 1 | 2 | 3,
  pose(): BinaryPose,
  scale(): BinaryPoint,
  color(): BinaryColorRgba,
  // Reverse-wrapped "markers" created in the 3D panel sometimes have no lifetimes :(((
  lifetime(): ?BinaryTime,
  frame_locked(): boolean,
  points(): ArrayView<BinaryPoint>,
  colors(): ArrayView<BinaryColorRgba>,
  text(): string,
  mesh_resource(): string,
  mesh_use_embedded_materials(): boolean,
|}>;

export type BinaryInstancedMarker = $ReadOnly<{|
  header(): BinaryHeader,
  ns(): string,
  id(): number,
  type(): 108,
  action(): 0 | 1 | 2 | 3,
  pose(): BinaryPose,
  scale(): BinaryPoint,
  color(): BinaryColorRgba,
  colors(): ArrayView<BinaryColorRgba>,
  points(): ArrayView<BinaryPoint>,
  // Reverse-wrapped "markers" created in the 3D panel sometimes have no lifetimes :(((
  lifetime(): ?BinaryTime,
  // Fields not provided from marker: frame_locked, text, mesh_resource, mesh_use_embedded_materials
  // Fields not present in marker:
  poses(): ArrayView<BinaryPose>,
  metadataByIndex(): $ReadOnlyArray<any>,
  closed(): boolean,
|}>;

export type BinaryMarkerArray = $ReadOnly<{|
  markers(): ArrayView<BinaryMarker>,
|}>;

type MapMetaData = $ReadOnly<{|
  map_load_time(): BinaryTime,
  resolution(): number,
  width(): number,
  height(): number,
  origin(): BinaryPose,
|}>;

export type BinaryOccupancyGrid = $ReadOnly<{|
  header(): BinaryHeader,
  info(): MapMetaData,
  data(): Int8Array,
|}>;

export type BinaryWebvizMarker = $ReadOnly<{|
  ...BinaryMarker,
  id(): string, // overridden type,
  metadata(): any, // JSON
|}>;

export type BinaryWebvizMarkerArray = $ReadOnly<{|
  header(): BinaryHeader,
  markers(): ArrayView<BinaryWebvizMarker>,
|}>;

export type BinaryWebvizFutureMarkerArray = $ReadOnly<{|
  header(): BinaryHeader,
  allMarkers(): ArrayView<BinaryWebvizMarker>,
|}>;
