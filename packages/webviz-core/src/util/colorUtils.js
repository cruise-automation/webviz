// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Color } from "webviz-core/src/types/Messages";

export type ReglColor = [number, number, number, number] | [number, number, number];

export const hexToReglRGB = (hex: string, alpha?: number): ReglColor => {
  const r = parseInt(hex.slice(1, 3), 16) / 255,
    g = parseInt(hex.slice(3, 5), 16) / 255,
    b = parseInt(hex.slice(5, 7), 16) / 255;
  return alpha ? [r, g, b, alpha] : [r, g, b];
};

export const hexToColorObj = (hex: string, alpha?: number): Color => {
  const [r, g, b] = hexToReglRGB(hex, alpha);
  return { r, g, b, a: alpha ?? 1 };
};
