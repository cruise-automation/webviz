// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type PointCloudSettings } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/PointCloudSettingsEditor";
import type { PointCloud2 } from "webviz-core/src/types/Messages";

export const DATATYPE = {
  uint8: 2,
  uint16: 4,
  int16: 3,
  int32: 5,
  float32: 7,
};

export type PointCloudMarker = PointCloud2 & {
  settings?: PointCloudSettings,

  // When hitmapColors are provided, we send them
  // straight to GPU, ignoring computations based on
  // color modes. As the name implies, this is only happening
  // when rendering to the Hitmap
  hitmapColors?: number[],
};

// Vertex buffer that will be used for attributes in shaders
export type VertexBuffer = {|
  buffer: Float32Array,
  offset: number, // number of float values from the start of each vertex
  stride: number, // number of float values in between vertices
|};

export type MemoizedMarker = {|
  marker: PointCloudMarker,
  settings?: PointCloudSettings,
  hitmapColors?: number[],
|};

export type MemoizedVertexBuffer = {|
  vertexBuffer: VertexBuffer,
  buffer: any,
  offset: number,
  stride: number,
  divisor: number,
|};
