// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Color } from "regl-worldview";

import type { PointCloud2 } from "webviz-core/src/types/Messages";

export type ColorMode =
  | {| mode: "rgb" |}
  | {| mode: "flat", flatColor: Color |}
  | {|
      mode: "gradient",
      colorField: string,
      minColor: Color,
      maxColor: Color,
      minValue?: number,
      maxValue?: number,
    |}
  | {|
      mode: "rainbow",
      colorField: string,
      minValue?: number,
      maxValue?: number,
    |};

export const DEFAULT_FLAT_COLOR = { r: 1, g: 1, b: 1, a: 1 };
export const DEFAULT_MIN_COLOR = { r: 0, g: 0, b: 1, a: 1 };
export const DEFAULT_MAX_COLOR = { r: 1, g: 0, b: 0, a: 1 };

export type PointCloudSettings = {|
  pointSize?: ?number,
  pointShape?: ?string,
  decayTime?: ?number,
  colorMode: ?ColorMode,
|};

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
