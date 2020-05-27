// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type MouseEventObject } from "regl-worldview";

import { getVertexValues, getVertexValue } from "./buffers";
import { parseHexColor } from "./decodeMarker";
import {
  type ClickedInfo,
  getAdditionalFieldNames,
  setRainbowColor,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands/Pointclouds/PointCloudBuilder";
import { DEFAULT_FLAT_COLOR } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/PointCloudSettingsEditor";
import { lerp } from "webviz-core/src/util";

// extract clicked point's position, color and additional field values to display in the UI
export function getClickedInfo(maybeFullyDecodedMarker: MouseEventObject, instanceIndex: ?number): ?ClickedInfo {
  const { positionBuffer, colorBuffer, fields, settings, is_bigendian } = maybeFullyDecodedMarker;
  if (!positionBuffer) {
    return null;
  }

  const pointIndex = instanceIndex || 0;

  // Extract [x, y, z] from position buffer;
  const clickedPoint = getVertexValues(positionBuffer, pointIndex, 3);

  let clickedPointColor: number[];
  const { colorMode } = settings;
  if (colorMode) {
    if (colorMode.mode === "rgb" && colorBuffer) {
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
    } else if (colorMode.mode === "gradient" && colorBuffer) {
      const { minColorValue, maxColorValue } = maybeFullyDecodedMarker;
      const colorFieldValue = getVertexValue(colorBuffer, pointIndex);
      const colorFieldRange = maxColorValue - minColorValue || Infinity;
      const pct = Math.max(0, Math.min((colorFieldValue - minColorValue) / colorFieldRange, 1));
      const { minColor, maxColor } = colorMode;
      const parsedMinColor = parseHexColor(minColor);
      const parsedMaxColor = parseHexColor(maxColor);
      clickedPointColor = [
        lerp(pct, parsedMinColor[0], parsedMaxColor[0]), // R
        lerp(pct, parsedMinColor[1], parsedMaxColor[1]), // G
        lerp(pct, parsedMinColor[2], parsedMaxColor[2]), // B
        1.0,
      ];
    } else if (colorMode.mode === "rainbow" && colorBuffer) {
      const { minColorValue, maxColorValue } = maybeFullyDecodedMarker;
      const colorFieldValue = getVertexValue(colorBuffer, pointIndex);
      const colorFieldRange = maxColorValue - minColorValue || Infinity;
      const pct = Math.max(0, Math.min((colorFieldValue - minColorValue) / colorFieldRange, 1));
      clickedPointColor = [0, 0, 0, 1];
      setRainbowColor(clickedPointColor, 0, pct);
    } else if (colorMode.mode === "flat") {
      clickedPointColor = parseHexColor(colorMode.flatColor || DEFAULT_FLAT_COLOR);
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
