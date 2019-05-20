// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { find } from "lodash";

import log from "webviz-core/src/panels/ThreeDimensionalViz/logger";
import type { PointCloud2, PointCloud2Field } from "webviz-core/src/types/Messages";

const datatype = {
  uint8: 2,
  uint16: 4,
  int32: 5,
  float32: 7,
};

interface FieldReader {
  read(data: number[], index: number): number;
}

class Float32Reader implements FieldReader {
  offset: number;
  view: DataView;
  constructor(offset: number) {
    this.offset = offset;
    const buffer = new ArrayBuffer(4);
    this.view = new DataView(buffer);
  }

  read(data: number[], index: number): number {
    this.view.setUint8(0, data[index + this.offset]);
    this.view.setUint8(1, data[index + this.offset + 1]);
    this.view.setUint8(2, data[index + this.offset + 2]);
    this.view.setUint8(3, data[index + this.offset + 3]);
    return this.view.getFloat32(0, true);
  }
}

class Int32Reader implements FieldReader {
  offset: number;
  view: DataView;
  constructor(offset: number) {
    this.offset = offset;
    const buffer = new ArrayBuffer(4);
    this.view = new DataView(buffer);
  }

  read(data: number[], index: number): number {
    this.view.setUint8(0, data[index + this.offset]);
    this.view.setUint8(1, data[index + this.offset + 1]);
    this.view.setUint8(2, data[index + this.offset + 2]);
    this.view.setUint8(3, data[index + this.offset + 3]);
    return this.view.getInt32(0, true);
  }
}

class Uint16Reader implements FieldReader {
  offset: number;
  view: DataView;
  constructor(offset: number) {
    this.offset = offset;
    const buffer = new ArrayBuffer(2);
    this.view = new DataView(buffer);
  }

  read(data: number[], index: number): number {
    this.view.setUint8(0, data[index + this.offset]);
    this.view.setUint8(1, data[index + this.offset + 1]);
    return this.view.getUint16(0, true);
  }
}

class Uint8Reader implements FieldReader {
  offset: number;
  constructor(offset: number) {
    this.offset = offset;
  }

  read(data: number[], index: number): number {
    return data[index + this.offset];
  }
}

class FieldOffsets {
  x: number = 0;
  y: number = 0;
  z: number = 0;
  rgb: number = 0;
  reader: ?FieldReader;
}

function getFieldOffsets(fields: PointCloud2Field[], colorField: ?string): ?FieldOffsets {
  const result = new FieldOffsets();
  const xField = find(fields, { name: "x" });
  if (!xField) {
    log.error("Unable to find x field for point cloud");
    return null;
  }
  if (xField.datatype !== datatype.float32) {
    log.error("x value not represented as float32");
    return null;
  }
  result.x = xField.offset;

  const yField = find(fields, { name: "y" });
  if (!yField) {
    log.error("Unable to find y field for point cloud");
    return null;
  }
  if (yField.datatype !== datatype.float32) {
    log.error("y value not represented as float32");
    return null;
  }
  result.y = yField.offset;

  const zField = find(fields, { name: "z" });
  if (!zField) {
    log.error("Unable to find z field for point cloud");
    return null;
  }
  if (zField.datatype !== datatype.float32) {
    log.error("z value not represented ast float32");
    return null;
  }
  result.z = zField.offset;

  const rgbField = find(fields, { name: "rgb" });
  result.rgb = rgbField ? rgbField.offset : -1;

  const field = colorField ? find(fields, { name: colorField }) : false;
  if (field) {
    switch (field.datatype) {
      case datatype.float32:
        result.reader = new Float32Reader(field.offset);
        break;
      case datatype.uint8:
        result.reader = new Uint8Reader(field.offset);
        break;
      case datatype.uint16:
        result.reader = new Uint16Reader(field.offset);
        break;
      case datatype.int32:
        result.reader = new Int32Reader(field.offset);
        break;
      default:
        log.error("colorField of value other than float32, uint16, int32, or uint8 not supported", field.datatype);
    }
  }

  return result;
}

const emptyArray = [];

export function mapMarker(marker: PointCloud2) {
  // http://docs.ros.org/api/sensor_msgs/html/msg/PointCloud2.html
  const { fields, data, width, row_step: rowStep, height, point_step: dataStep, colorField, color } = marker;

  const offsets = getFieldOffsets(fields, colorField);

  if (!offsets) {
    console.warn("missing field offsets for marker");
    return { points: [], colors: [] };
  }

  const pointStep = 12;
  const colorStep = 3;
  const points = new Uint8Array(width * height * 12);
  const colors = new Uint8Array(width * height * 3);
  let pointCount = 0;
  let minColorFieldValue = Number.MAX_VALUE;
  let maxColorFieldValue = Number.MIN_VALUE;
  // the field "rgb" has a special parsing code path - it's packed into the first three bytes of a float32
  // so if the colorField is rgb don't use a reader - its faster to just read the value directly
  // it also is the default rendering option if no custom colorField is specified
  const useRGB = offsets.rgb !== -1 && (!colorField || colorField === "rgb");
  const useColorField = !useRGB && offsets.reader;

  // use empty array if not coloring with colorField to avoid unneeded allocation
  const colorFieldValues = useColorField ? new Array(width * height) : emptyArray;

  // in practice we use height:1 pointCloud2 messages
  // but for completeness sake, we support any height of array
  for (let j = 0; j < height; j++) {
    const dataOffset = j * rowStep;
    for (let i = 0; i < width; i++) {
      const dataStart = i * dataStep + dataOffset;
      const x1 = data[dataStart + offsets.x];
      const x2 = data[dataStart + offsets.x + 1];
      const x3 = data[dataStart + offsets.x + 2];
      const x4 = data[dataStart + offsets.x + 3];

      const pointStart = pointCount * pointStep;

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
      points[pointStart + 4] = data[dataStart + offsets.y];
      points[pointStart + 5] = data[dataStart + offsets.y + 1];
      points[pointStart + 6] = data[dataStart + offsets.y + 2];
      points[pointStart + 7] = data[dataStart + offsets.y + 3];

      // add z point
      points[pointStart + 8] = data[dataStart + offsets.z];
      points[pointStart + 9] = data[dataStart + offsets.z + 1];
      points[pointStart + 10] = data[dataStart + offsets.z + 2];
      points[pointStart + 11] = data[dataStart + offsets.z + 3];

      // add color
      const colorStart = pointCount * colorStep;

      if (useRGB) {
        colors[colorStart] = data[dataStart + offsets.rgb];
        colors[colorStart + 1] = data[dataStart + offsets.rgb + 1];
        colors[colorStart + 2] = data[dataStart + offsets.rgb + 2];
      } else if (useColorField && offsets.reader) {
        const colorValue = offsets.reader.read(data, dataStart);
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
