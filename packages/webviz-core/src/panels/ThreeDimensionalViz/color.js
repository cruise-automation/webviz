// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type {
  Color,
  BaseMarker,
  LineListMarker,
  LineStripMarker,
  SphereListMarker,
  PointsMarker,
} from "webviz-core/src/types/Messages";

export const colors = {
  white: { r: 1, g: 1, b: 1, a: 1 },
};

export function fromRGBA(color?: Color) {
  return color || colors.white;
}

export function getColor(marker: BaseMarker) {
  return fromRGBA(marker.color);
}

export function getCSSColor(marker: BaseMarker) {
  const { r, g, b, a } = marker.color || colors.white;
  return `rgba(${(r * 255).toFixed()}, ${(g * 255).toFixed()}, ${(b * 255).toFixed()}, ${a.toFixed(3)})`;
}

// get a color segment from a marker which may contain
// multiple color definitions corresponding to its number of segments
type MarkerType = LineStripMarker | LineListMarker | SphereListMarker | PointsMarker;
export function getSegmentColor(marker: MarkerType, segmentIndex: number) {
  if (marker.colors && marker.colors.length) {
    const color = marker.colors[segmentIndex];
    if (color) {
      return color;
    }
  }
  return marker.color || colors.white;
}
