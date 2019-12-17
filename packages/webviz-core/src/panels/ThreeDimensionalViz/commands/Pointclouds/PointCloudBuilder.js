// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { omit, isEqual, difference } from "lodash";
import microMemoize from "micro-memoize";
import { type MouseEventObject } from "regl-worldview";

import { type FieldReader, Float32Reader, Int32Reader, Uint16Reader, Int16Reader, Uint8Reader } from "./Readers";
import log from "webviz-core/src/panels/ThreeDimensionalViz/logger";
import {
  DEFAULT_FLAT_COLOR,
  type PointCloudSettings,
  type ColorMode,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/PointCloudSettingsEditor";
import type { PointCloud2, PointField } from "webviz-core/src/types/Messages";
import { lerp } from "webviz-core/src/util";

const EMPTY_ARRAY = [];
const REQUIRED_FLOAT32_FIELDS = ["x", "y", "z"];
const DATATYPE = {
  uint8: 2,
  uint16: 4,
  int16: 3,
  int32: 5,
  float32: 7,
};

type FieldOffsetsAndReaders = {
  [name: string]: { datatype: string, offset: number, reader: ?FieldReader },
};

function getReader(datatype, offset: number) {
  switch (datatype) {
    case DATATYPE.float32:
      return new Float32Reader(offset);
    case DATATYPE.uint8:
      return new Uint8Reader(offset);
    case DATATYPE.uint16:
      return new Uint16Reader(offset);
    case DATATYPE.int16:
      return new Int16Reader(offset);
    case DATATYPE.int32:
      return new Int32Reader(offset);
    default:
      log.error("Unsupported datatype", datatype);
  }
}

function getFieldOffsetsAndReaders(fields: PointField[]): FieldOffsetsAndReaders {
  const result = {};
  for (const { name, datatype, offset = 0 } of fields) {
    result[name] = { datatype, offset, reader: getReader(datatype, offset) };
  }
  return result;
}

function parseHexColor(color: string) {
  console.assert(color.length === 7);
  return parseInt(color.slice(1), 16);
}

export function mapMarker(marker: PointCloud2 & { settings?: PointCloudSettings }, decodeAllFields?: boolean) {
  // http://docs.ros.org/api/sensor_msgs/html/msg/PointCloud2.html
  const { fields, data, width, row_step, height, point_step, settings = {} } = marker;
  const offsetsAndReaders = getFieldOffsetsAndReaders(fields);

  for (const float32Field of REQUIRED_FLOAT32_FIELDS) {
    if (!offsetsAndReaders[float32Field]) {
      log.error(`point cloud is missing field '${float32Field}'`);
      return { points: [], colors: [] };
    } else if (offsetsAndReaders[float32Field].datatype !== DATATYPE.float32) {
      log.error(`expected '${float32Field}' to be a float32 field (found ${offsetsAndReaders[float32Field].datatype})`);
      return { points: [], colors: [] };
    }
  }
  const {
    x: { offset: xOffset },
    y: { offset: yOffset },
    z: { offset: zOffset },
    rgb: { offset: rgbOffset } = {},
  } = offsetsAndReaders;

  const colorMode: ColorMode = settings.colorMode
    ? settings.colorMode
    : rgbOffset != null
    ? { mode: "rgb" }
    : { mode: "flat", flatColor: DEFAULT_FLAT_COLOR };

  const points = new Uint8Array(width * height * 12);
  const colors = new Uint8Array(width * height * 3);

  let autoMinValue = true;
  let autoMaxValue = true;
  let minColorFieldValue = Infinity;
  let maxColorFieldValue = -Infinity;
  if (colorMode.mode === "gradient" || colorMode.mode === "rainbow") {
    if (colorMode.minValue != null) {
      autoMinValue = false;
      minColorFieldValue = colorMode.minValue;
    }
    if (colorMode.maxValue != null) {
      autoMaxValue = false;
      maxColorFieldValue = colorMode.maxValue;
    }
  }

  // the field "rgb" has a special parsing code path - it's packed into the first three bytes of a float32
  // so if the colorField is rgb don't use a reader - its faster to just read the value directly
  // it also is the default rendering option if no custom colorField is specified
  const useRGB = colorMode.mode === "rgb" && rgbOffset != null;

  const useFlatColor = colorMode.mode === "flat";
  const parsedFlatColor = colorMode.mode === "flat" ? parseHexColor(colorMode.flatColor) : 0;
  const flatColorR = (parsedFlatColor >> 16) & 0xff;
  const flatColorG = (parsedFlatColor >> 8) & 0xff;
  const flatColorB = parsedFlatColor & 0xff;

  const colorFieldReader =
    colorMode.mode === "rainbow" || colorMode.mode === "gradient"
      ? offsetsAndReaders[colorMode.colorField]?.reader
      : null;
  if (colorMode.colorField && !colorFieldReader) {
    log.warn(`color field ${colorMode.colorField} not found in point cloud`);
  }
  const colorFieldValues = colorFieldReader ? new Float64Array(width * height) : EMPTY_ARRAY;

  let pointCount = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const pointDataStart = row * row_step + col * point_step;
      const x1 = data[pointDataStart + xOffset];
      const x2 = data[pointDataStart + xOffset + 1];
      const x3 = data[pointDataStart + xOffset + 2];
      const x4 = data[pointDataStart + xOffset + 3];

      // if the value is NaN then don't count this point
      // this is to support non-dense point clouds
      // https://answers.ros.org/question/234455/pointcloud2-and-pointfield/
      if ((x4 & 0x7f) === 0x7f && (x3 & 0x80) === 0x80) {
        continue;
      }

      const pointStart = pointCount * 12;

      // add x point
      points[pointStart] = x1;
      points[pointStart + 1] = x2;
      points[pointStart + 2] = x3;
      points[pointStart + 3] = x4;

      // add y point
      points[pointStart + 4] = data[pointDataStart + yOffset];
      points[pointStart + 5] = data[pointDataStart + yOffset + 1];
      points[pointStart + 6] = data[pointDataStart + yOffset + 2];
      points[pointStart + 7] = data[pointDataStart + yOffset + 3];

      // add z point
      points[pointStart + 8] = data[pointDataStart + zOffset];
      points[pointStart + 9] = data[pointDataStart + zOffset + 1];
      points[pointStart + 10] = data[pointDataStart + zOffset + 2];
      points[pointStart + 11] = data[pointDataStart + zOffset + 3];

      // add color
      const colorStart = pointCount * 3;
      if (useFlatColor) {
        colors[colorStart] = flatColorR;
        colors[colorStart + 1] = flatColorG;
        colors[colorStart + 2] = flatColorB;
      } else if (useRGB) {
        colors[colorStart] = data[pointDataStart + rgbOffset];
        colors[colorStart + 1] = data[pointDataStart + rgbOffset + 1];
        colors[colorStart + 2] = data[pointDataStart + rgbOffset + 2];
      } else if (colorFieldReader) {
        const colorFieldValue = colorFieldReader.read(data, pointDataStart);
        colorFieldValues[pointCount] = colorFieldValue;
        if (!Number.isNaN(colorFieldValue)) {
          if (autoMinValue) {
            minColorFieldValue = Math.min(minColorFieldValue, colorFieldValue);
          }
          if (autoMaxValue) {
            maxColorFieldValue = Math.max(maxColorFieldValue, colorFieldValue);
          }
        }
      } else {
        throw new Error(`unexpected color mode ${colorMode.mode}`);
      }
      pointCount++;
    }
  }

  if (colorFieldReader) {
    // if min and max are equal set the diff to something huge
    // so when we divide by it we effectively get zero.
    // taken from http://docs.ros.org/jade/api/rviz/html/c++/point__cloud__transformers_8cpp_source.html
    // line 132
    const colorFieldRange = maxColorFieldValue - minColorFieldValue || Infinity;

    // we need to loop through colorField values again now that we know min/max
    // and assign a color to the pointCloud for each colorField value

    // use custom gradient
    if (colorMode.mode === "gradient") {
      const parsedMinColor = parseHexColor(colorMode.minColor);
      const parsedMaxColor = parseHexColor(colorMode.maxColor);
      for (let i = 0; i < pointCount; i++) {
        const offset = i * 3;
        const val = colorFieldValues[i];
        const pct = Math.max(0, Math.min((val - minColorFieldValue) / colorFieldRange, 1));

        const minR = (parsedMinColor >> 16) & 0xff;
        const minG = (parsedMinColor >> 8) & 0xff;
        const minB = parsedMinColor & 0xff;

        const maxR = (parsedMaxColor >> 16) & 0xff;
        const maxG = (parsedMaxColor >> 8) & 0xff;
        const maxB = parsedMaxColor & 0xff;

        colors[offset] = lerp(pct, minR, maxR);
        colors[offset + 1] = lerp(pct, minG, maxG);
        colors[offset + 2] = lerp(pct, minB, maxB);
      }
    }
    // use rainbow
    else if (colorMode.mode === "rainbow") {
      for (let i = 0; i < pointCount; i++) {
        const offset = i * 3;
        const val = colorFieldValues[i];
        const pct = Math.max(0, Math.min((val - minColorFieldValue) / colorFieldRange, 1));
        setRainbowColor(colors, offset, pct);
      }
    } else {
      throw new Error(`unexpected color mode ${colorMode.mode}`);
    }
  }

  return {
    ...marker,
    points: new Float32Array(points.buffer, 0, pointCount * 3),
    colors,
  };
}

type ClickedInfo = {
  clickedPoint: number[],
  clickedPointColor?: number[],
  additionalFieldValues?: { [name: string]: ?number },
};

// extract clicked point's position, color and additional field values to display in the UI
export function getClickedInfo(maybeFullyDecodedMarker: MouseEventObject, instanceIndex: ?number): ?ClickedInfo {
  const { points, colors, fields, ...rest } = maybeFullyDecodedMarker;
  const allPoints: number[] = points || [];
  let result: ?ClickedInfo;
  if (allPoints.length && instanceIndex != null && instanceIndex >= 0 && instanceIndex * 3 < allPoints.length) {
    result = { clickedPoint: [] };
    const baseIdx = instanceIndex * 3;
    result.clickedPoint.push(allPoints[baseIdx]);
    result.clickedPoint.push(allPoints[baseIdx + 1]);
    result.clickedPoint.push(allPoints[baseIdx + 2]);
    const allColors: number[] = colors || [];
    const baseColorR = allColors[baseIdx];
    const baseColorG = allColors[baseIdx + 1];
    const baseColorB = allColors[baseIdx + 2];
    if (baseColorR && baseColorG && baseColorB) {
      result.clickedPointColor = [baseColorR, baseColorG, baseColorB, 1];
    }
    const additionalField = getAdditionalFieldNames(fields);
    if (additionalField.length) {
      result.additionalFieldValues = additionalField.reduce((memo, fieldName) => {
        if (rest[fieldName]) {
          memo[fieldName] = rest[fieldName][instanceIndex];
        }
        return memo;
      }, {});
    }
  }
  return result;
}

function getAdditionalFieldNames(fields: PointField[]): string[] {
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
function setRainbowColor(colors: Uint8Array, offset: number, pct: number) {
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

// Compare `data` field by reference because the same marker msg contains the same binary data,
// and `settings` field by deep-equality check since it's recreated whenever Layout re-renders.
const isPointCloudEqual = (a, b) => {
  return a.data === b.data && isEqual(a.settings, b.settings);
};

export const memoizedMapMarker = microMemoize(mapMarker, { isEqual: isPointCloudEqual, maxSize: 30 });
