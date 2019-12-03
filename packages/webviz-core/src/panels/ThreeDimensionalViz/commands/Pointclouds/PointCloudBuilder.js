// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { omit, isEqual, difference } from "lodash";
import microMemoize from "micro-memoize";
import { type MouseEventObject } from "regl-worldview";

import { type FieldReader, Float32Reader, Int32Reader, Uint16Reader, Int16Reader, Uint8Reader } from "./Readers";
import log from "webviz-core/src/panels/ThreeDimensionalViz/logger";
import type { PointCloud2, PointCloud2Field } from "webviz-core/src/types/Messages";

const EMPTY_ARRAY = [];
const POINT_STEP = 12;
const COLOR_STEP = 3;
const FLOAT32_FIELDS = ["x", "y", "z"];
const DATATYPE = {
  uint8: 2,
  uint16: 4,
  int16: 3,
  int32: 5,
  float32: 7,
};

type FieldOffsetsAndReaders = {
  x: { offset: number },
  y: { offset: number },
  z: { offset: number },
  rgb?: { offset: number },
  rgbOverride?: { offset: number, reader: ?FieldReader },
  [additionalFieldName: string]: { offset: number, reader: FieldReader },
};

function getReader(datatype, offset: number, isColorField?: boolean) {
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
      if (isColorField) {
        log.error("colorField of value other than float32, uint16, int32, or uint8 not supported", datatype);
      } else {
        log.error("Unsupported datatype", datatype);
      }
  }
}

function getFieldOffsetsAndReaders(
  fields: PointCloud2Field[],
  colorField: ?string,
  decodeAllFields?: boolean
): ?FieldOffsetsAndReaders {
  const result = {};
  fields.forEach((field) => {
    const { name, datatype, offset = 0 } = field;
    if (name === colorField) {
      result.rgbOverride = { offset, reader: getReader(datatype, offset, true) };
    }
    if (FLOAT32_FIELDS.includes(name)) {
      if (datatype !== DATATYPE.float32) {
        log.error(`${name} value not represented as float32`);
      } else {
        result[name] = { offset };
      }
    } else if (name === "rgb") {
      result.rgb = field;
    } else if (decodeAllFields) {
      // additional field to be decoded after interacting with the point cloud
      result[name] = { offset, reader: getReader(datatype, offset) };
    }
  });

  if (result.x == null) {
    log.error("Unable to find x field for point cloud");
    return;
  }
  if (result.y == null) {
    log.error("Unable to find y field for point cloud");
    return;
  }
  if (result.z == null) {
    log.error("Unable to find z field for point cloud");
    return;
  }
  if (result.rgb == null) {
    result.rgb = { offset: -1 };
  }

  return result;
}

export function mapMarker(marker: PointCloud2, decodeAllFields?: boolean) {
  // http://docs.ros.org/api/sensor_msgs/html/msg/PointCloud2.html
  const { fields, data, width, row_step: rowStep, height, point_step: dataStep, colorField, color } = marker;
  const offsetAndReaders = getFieldOffsetsAndReaders(fields, colorField);

  if (!offsetAndReaders) {
    console.warn("missing field offsets for marker");
    return { points: [], colors: [] };
  }
  const {
    x: { offset: xOffset },
    y: { offset: yOffset },
    z: { offset: zOffset },
    rgb: { offset: rgbOffset } = {},
    rgbOverride: { reader: rgbOverrideReader } = {},
  } = offsetAndReaders;
  const points = new Uint8Array(width * height * 12);
  const colors = new Uint8Array(width * height * 3);
  let pointCount = 0;
  let minColorFieldValue = Number.MAX_VALUE;
  let maxColorFieldValue = Number.MIN_VALUE;
  // the field "rgb" has a special parsing code path - it's packed into the first three bytes of a float32
  // so if the colorField is rgb don't use a reader - its faster to just read the value directly
  // it also is the default rendering option if no custom colorField is specified
  const useRGB = rgbOffset !== -1 && (!colorField || colorField === "rgb");
  const useColorField = !useRGB && offsetAndReaders.rgbOverride;
  // use empty array if not coloring with colorField to avoid unneeded allocation
  const colorFieldValues = useColorField ? new Array(width * height) : EMPTY_ARRAY;

  // in practice we use height:1 pointCloud2 messages
  // but for completeness sake, we support any height of array
  for (let row = 0; row < height; row++) {
    const dataOffset = row * rowStep;
    for (let col = 0; col < width; col++) {
      const dataStart = col * dataStep + dataOffset;
      const x1 = data[dataStart + xOffset];
      const x2 = data[dataStart + xOffset + 1];
      const x3 = data[dataStart + xOffset + 2];
      const x4 = data[dataStart + xOffset + 3];

      const pointStart = pointCount * POINT_STEP;

      // if the value is NaN then don't count this point
      // this is to support non-dense point clouds
      // https://answers.ros.org/question/234455/pointcloud2-and-pointfield/
      if ((x4 & 0x7f) === 0x7f && (x3 & 0x80) === 0x80) {
        continue;
      }

      // add x point
      points[pointStart] = x1;
      points[pointStart + 1] = x2;
      points[pointStart + 2] = x3;
      points[pointStart + 3] = x4;

      // add y point
      points[pointStart + 4] = data[dataStart + yOffset];
      points[pointStart + 5] = data[dataStart + yOffset + 1];
      points[pointStart + 6] = data[dataStart + yOffset + 2];
      points[pointStart + 7] = data[dataStart + yOffset + 3];

      // add z point
      points[pointStart + 8] = data[dataStart + zOffset];
      points[pointStart + 9] = data[dataStart + zOffset + 1];
      points[pointStart + 10] = data[dataStart + zOffset + 2];
      points[pointStart + 11] = data[dataStart + zOffset + 3];

      // add color
      const colorStart = pointCount * COLOR_STEP;
      if (useRGB) {
        colors[colorStart] = data[dataStart + rgbOffset];
        colors[colorStart + 1] = data[dataStart + rgbOffset + 1];
        colors[colorStart + 2] = data[dataStart + rgbOffset + 2];
      } else if (useColorField && rgbOverrideReader) {
        const colorValue = rgbOverrideReader.read(data, dataStart);
        colorFieldValues[pointCount] = colorValue;
        if (!Number.isNaN(colorValue)) {
          minColorFieldValue = Math.min(minColorFieldValue, colorValue);
          maxColorFieldValue = Math.max(maxColorFieldValue, colorValue);
        }
      } else {
        // rgb isn't mandatory - color white if not found in fields
        colors[colorStart] = 255;
        colors[colorStart + 1] = 255;
        colors[colorStart + 2] = 255;
      }
      // increase point count by 1
      pointCount++;
    }
  }

  // we need to loop through colorField values again now that we know min/max
  // and assign a color to the pointCloud for each colorField value
  if (useColorField || color) {
    // if min and max are equal set the diff to something huge
    // so when we divide by it we effectively get zero.
    // taken from http://docs.ros.org/jade/api/rviz/html/c++/point__cloud__transformers_8cpp_source.html
    // line 132
    const colorFieldRange = maxColorFieldValue - minColorFieldValue || 1e20;
    const parsedColor = getParsedColor(color);
    for (let i = 0; i < pointCount; i++) {
      const idx = i * 3;
      const val = colorFieldValues[i];
      const pct = (val - minColorFieldValue) / colorFieldRange;

      if (parsedColor) {
        colors[idx] = parsedColor[0];
        colors[idx + 1] = parsedColor[1];
        colors[idx + 2] = parsedColor[2];
      } else {
        setColorFieldColor(colors, idx, pct, color);
      }
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

function getAdditionalFieldNames(fields: PointCloud2Field[]): string[] {
  const allFields = fields.map((field) => field.name);
  return difference(allFields, ["rgb", "rgbOverride", "x", "y", "z"]);
}

export function decodeAdditionalFields(marker: PointCloud2): { [fieldName: string]: number[] } {
  const { fields, data, width, row_step: rowStep, height, point_step: dataStep, colorField } = marker;
  const offsets = getFieldOffsetsAndReaders(fields, colorField, true);
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
    const dataOffset = row * rowStep;
    for (let col = 0; col < width; col++) {
      const dataStart = col * dataStep + dataOffset;
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

function getParsedColor(color) {
  if (color) {
    const rgbVals = color.split(",").map((char) => parseInt(char));
    const r = rgbVals[0] || 0;
    const g = rgbVals[1] || 0;
    const b = rgbVals[2] || 0;
    return [r, g, b];
  }
  return null;
}

// taken from http://docs.ros.org/jade/api/rviz/html/c++/point__cloud__transformers_8cpp_source.html
// line 47
// TODO - implement 1 solid color, hue change (e.g. spread from (55, 0, 0, 1) => (30, 0, 0, 1));
function setColorFieldColor(colors: Uint8Array, idx: number, val: number, color?: string) {
  const h = (1 - val) * 5.0 + 1.0;
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
  colors[idx] = r * 255;
  colors[idx + 1] = g * 255;
  colors[idx + 2] = b * 255;
}

// Compare `data` field by reference because the same marker msg contains the same binary data,
// and `settings` field by deep-equality check since it's recreated whenever Layout re-renders.
const isPointCloudEqual = (a, b) => {
  return a.data === b.data && isEqual(a.settings, b.settings);
};

export const memoizedMapMarker = microMemoize(
  ({ data, settings = {}, ...rest }) => {
    return mapMarker({ data, ...rest, ...settings });
  },
  { isEqual: isPointCloudEqual, maxSize: 30 }
);
