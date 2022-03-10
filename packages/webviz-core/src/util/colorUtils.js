// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Color } from "webviz-core/src/types/Messages";

export type ReglColor = [number, number, number, number];

export const hexToRgbString = (hex: string, alpha?: number): string => {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha ?? 1})`;
};

export const hexToReglRGB = (hex: string, alpha?: number): ReglColor => {
  const r = parseInt(hex.slice(1, 3), 16) / 255,
    g = parseInt(hex.slice(3, 5), 16) / 255,
    b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, alpha ?? 1];
};

export const hexToColorObj = (hex: string, alpha?: number): Color => {
  const [r, g, b] = hexToReglRGB(hex, alpha);
  return { r, g, b, a: alpha ?? 1 };
};

export const interpolate = (a: number, b: number, t: number): number => (b - a) * t + a;
export const interpolateColor = (colorA: ReglColor, colorB: ReglColor, t: number): ReglColor => {
  const [rA, gA, bA, aA] = colorA;
  const [rB, gB, bB, aB] = colorB;
  return [interpolate(rA, rB, t), interpolate(gA, gB, t), interpolate(bA, bB, t), interpolate(aA, aB, t)];
};

// Converts a CSS-like string, "rgba(r,g,b,a)", with RGB values from 0-255
// to a regl number array [r,g,b,a] with values from 0-1
export const rgbStrToReglRGB = (numberStr: string, alpha?: number): ReglColor => {
  const [_, r, g, b, a = "1"] =
    numberStr.match(/rgba?\(\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,?\s*(\d+\.?\d*)?\s*\)/) ?? [];
  const [percentR, percentG, percentB] = [r, g, b].map((n) => +(parseFloat(n) / 255).toFixed(3) ?? 0);
  return [percentR, percentG, percentB, alpha ?? parseFloat(a) ?? 1];
};

export const cssColorStrToColorObj = (numberStr: string, alpha?: number): Color => {
  const [r, g, b, a] = rgbStrToReglRGB(numberStr, alpha);
  return { r, g, b, a };
};

export function colorToRgbaString({ r, g, b, a }: Color): string {
  return `rgba(${Math.floor(r * 255)},${Math.floor(g * 255)},${Math.floor(b * 255)},${a})`;
}

export function reglColorToRgbaString(color: ReglColor): string {
  const [r, g, b, a = 1] = color;
  return colorToRgbaString({ r, g, b, a });
}
