// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type FieldOffsetsAndReaders } from "webviz-core/src/panels/ThreeDimensionalViz/commands/PointClouds/buffers";
import { type VertexBuffer } from "webviz-core/src/panels/ThreeDimensionalViz/commands/PointClouds/types";

// Allows converting azimuth, elevation, range points to x, y, z points.
const maybeConvertSphericalCoordinatePointCloudToCartesian = ({
  data,
  fields,
  pointCount,
  stride,
  sphericalRangeScale,
}: $ReadOnly<{|
  data: Uint8Array,
  fields: FieldOffsetsAndReaders,
  pointCount: number,
  stride: number,
  sphericalRangeScale?: number,
|}>): ?VertexBuffer => {
  if (!fields.azimuth) {
    return null;
  }
  const azimuthReader = fields.azimuth?.reader;
  const elevationReader = fields.elevation?.reader;
  const rangeReader = fields.scaled_range?.reader;
  const toRadians = (centideg) => (0.01 * centideg * Math.PI) / 180.0;

  if (azimuthReader && elevationReader && rangeReader) {
    const COMPONENT_COUNT = 3;
    const buffer = new Float32Array(COMPONENT_COUNT * pointCount);
    for (let i = 0; i < pointCount; i++) {
      const pointStart = i * stride;
      const azimuth = toRadians(azimuthReader.read(data, pointStart));
      const elevation = toRadians(elevationReader.read(data, pointStart));
      const range = (sphericalRangeScale || 1) * rangeReader.read(data, pointStart);
      const x = range * Math.cos(elevation) * Math.cos(azimuth);
      const y = range * Math.cos(elevation) * Math.sin(azimuth);
      const z = range * Math.sin(elevation);
      const offset = i * COMPONENT_COUNT;
      buffer[offset + 0] = x;
      buffer[offset + 1] = y;
      buffer[offset + 2] = z;
    }
    return {
      buffer,
      offset: 0,
      stride: COMPONENT_COUNT,
    };
  }
};

export default maybeConvertSphericalCoordinatePointCloudToCartesian;
