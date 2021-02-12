// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { omit, difference, isEmpty, isNil } from "lodash";
import { type MouseEventObject, toRGBA, type Color } from "regl-worldview";

import { getVertexValues, getVertexValue, getFieldOffsetsAndReaders, getVertexCount } from "./buffers";
import {
  DEFAULT_FLAT_COLOR,
  DEFAULT_MIN_COLOR,
  DEFAULT_MAX_COLOR,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/PointCloudSettingsEditor";
import type { PointCloud2, PointField } from "webviz-core/src/types/Messages";
import { lerp } from "webviz-core/src/util";

export type ClickedInfo = {
  clickedPoint: number[],
  clickedPointColor?: number[],
  additionalFieldValues?: { [name: string]: ?number },
};

export function toRgba(rgba: Color): Color {
  return toRGBA({ r: rgba.r * 255, g: rgba.g * 255, b: rgba.b * 255, a: rgba.a });
}

// extract clicked point's position, color and additional field values to display in the UI
export function getClickedInfo(maybeFullyDecodedMarker: MouseEventObject, instanceIndex: ?number): ?ClickedInfo {
  const { positionBuffer, colorBuffer, fields, settings, is_bigendian } = maybeFullyDecodedMarker;
  if (isEmpty(positionBuffer) || isNil(instanceIndex) || instanceIndex >= getVertexCount(positionBuffer)) {
    return undefined;
  }

  const pointIndex = instanceIndex || 0;

  // Extract [x, y, z] from position buffer;
  const clickedPoint = getVertexValues(positionBuffer, pointIndex, 3);

  let clickedPointColor: number[];
  const { colorMode } = settings;
  if (colorMode) {
    if (colorMode.mode === "rgb" && !isEmpty(colorBuffer)) {
      // Extract [r, g, b, a] from colors buffer
      clickedPointColor = [
        ...getVertexValues(colorBuffer, pointIndex, 3),
        // alpha value is set to 1 since 'colorBuffer' only stores
        // [r, g, b] components. Shaders always use an alpha value
        // of 1 as well.
        1.0,
      ];
      if (!is_bigendian) {
        // When data uses little endianess, colors are in BGR format
        // and we must swap R and B channels to display them correclty.
        const temp = clickedPointColor[2];
        clickedPointColor[2] = clickedPointColor[0];
        clickedPointColor[0] = temp;
      }
    } else if (colorMode.mode === "gradient" && !isEmpty(colorBuffer)) {
      const { minColorValue, maxColorValue } = maybeFullyDecodedMarker;
      const colorFieldValue = getVertexValue(colorBuffer, pointIndex);
      const colorFieldRange = maxColorValue - minColorValue || Infinity;
      const pct = Math.max(0, Math.min((colorFieldValue - minColorValue) / colorFieldRange, 1));
      const { minColor, maxColor } = colorMode;
      const parsedMinColor = toRgba(minColor || DEFAULT_MIN_COLOR);
      const parsedMaxColor = toRgba(maxColor || DEFAULT_MAX_COLOR);
      clickedPointColor = [
        lerp(pct, parsedMinColor[0], parsedMaxColor[0]), // R
        lerp(pct, parsedMinColor[1], parsedMaxColor[1]), // G
        lerp(pct, parsedMinColor[2], parsedMaxColor[2]), // B
        1.0,
      ];
    } else if (colorMode.mode === "rainbow" && !isEmpty(colorBuffer)) {
      const { minColorValue, maxColorValue } = maybeFullyDecodedMarker;
      const colorFieldValue = getVertexValue(colorBuffer, pointIndex);
      const colorFieldRange = maxColorValue - minColorValue || Infinity;
      const pct = Math.max(0, Math.min((colorFieldValue - minColorValue) / colorFieldRange, 1));
      clickedPointColor = [0, 0, 0, 1];
      setRainbowColor(clickedPointColor, 0, pct);
    } else if (colorMode.mode === "flat") {
      clickedPointColor = toRgba(colorMode.flatColor || DEFAULT_FLAT_COLOR);
    }
  }

  let additionalFieldValues: { [name: string]: ?number };
  const additionalField = getAdditionalFieldNames(fields);
  if (additionalField.length) {
    additionalFieldValues = additionalField.reduce((memo, fieldName) => {
      const values = maybeFullyDecodedMarker[fieldName];
      if (values) {
        memo[fieldName] = values[pointIndex];
      }
      return memo;
    }, {});
  }

  return {
    clickedPoint,
    clickedPointColor,
    additionalFieldValues,
  };
}

// Extract positions so they can be saved to a file
export function getAllPoints(maybeFullyDecodedMarker: MouseEventObject): number[] {
  const { pointCount, positionBuffer } = maybeFullyDecodedMarker;
  const ret = [];
  for (let i = 0; i < pointCount; i++) {
    const position = getVertexValues(positionBuffer, i, 3);
    if (!Number.isNaN(position[0])) {
      ret.push(...position);
    }
  }
  return ret;
}

export function getAdditionalFieldNames(fields: $ReadOnlyArray<PointField>): string[] {
  const allFields = fields.map((field) => field.name);
  return difference(allFields, ["rgb", "x", "y", "z"]);
}

export function decodeAdditionalFields(marker: PointCloud2): { [fieldName: string]: number[] } {
  const { fields, data, width, row_step, height, point_step } = marker;
  const offsets = getFieldOffsetsAndReaders(fields);
  if (!offsets) {
    return {};
  }

  let pointCount = 0;
  const additionalField = getAdditionalFieldNames(fields);
  const otherFieldsValues = additionalField.reduce((memo, name) => {
    memo[name] = new Array(width * height);
    return memo;
  }, {});
  for (let row = 0; row < height; row++) {
    const dataOffset = row * row_step;
    for (let col = 0; col < width; col++) {
      const dataStart = col * point_step + dataOffset;
      for (const fieldName of additionalField) {
        const reader = offsets[fieldName].reader;
        if (reader) {
          const fieldValue = reader.read(data, dataStart);
          otherFieldsValues[fieldName][pointCount] = fieldValue;
        }
      }
      // increase point count by 1
      pointCount++;
    }
  }

  return {
    ...omit(marker, "data"), // no need to include data since all fields have been decoded
    ...otherFieldsValues,
  };
}

// taken from http://docs.ros.org/jade/api/rviz/html/c++/point__cloud__transformers_8cpp_source.html
// line 47
export function setRainbowColor(colors: Uint8Array | number[], offset: number, pct: number) {
  const h = (1 - pct) * 5.0 + 1.0;
  const i = Math.floor(h);
  let f = h % 1.0;
  // if i is even
  if ((i & 1) === 0) {
    f = 1 - f;
  }
  const n = 1 - f;
  let r = 0;
  let g = 0;
  let b = 0;
  if (i <= 1) {
    r = n;
    g = 0;
    b = 1;
  } else if (i === 2) {
    r = 0;
    g = n;
    b = 1;
  } else if (i === 3) {
    r = 0;
    g = 1;
    b = n;
  } else if (i === 4) {
    r = n;
    g = 1;
    b = 0;
  } else {
    r = 1;
    g = n;
    b = 0;
  }
  colors[offset] = r * 255;
  colors[offset + 1] = g * 255;
  colors[offset + 2] = b * 255;
}
