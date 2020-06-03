// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ColorPicker from "rc-color-picker";
import React from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

export const PICKER_SIZE = {
  NORMAL: { name: "NORMAL", size: 24 },
  SMALL: { name: "SMALL", size: 16 },
};

export type Size = $Keys<typeof PICKER_SIZE>;
type Placement = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
type Props = {|
  color: ?string,
  onChange: (newColor: string) => void,
  placement?: Placement,
  size?: ?Size,
|};

const SWrapper = styled.span`
  .rc-color-picker-trigger {
    border: none;
    box-shadow: none;
    display: inline-block;
    width: ${({ isSmallSize }) => (isSmallSize ? PICKER_SIZE.SMALL.size : PICKER_SIZE.NORMAL.size)}px;
    height: ${({ isSmallSize }) => (isSmallSize ? PICKER_SIZE.SMALL.size : PICKER_SIZE.NORMAL.size)}px;
    border-radius: ${({ isSmallSize }) => (isSmallSize ? PICKER_SIZE.SMALL.size / 2 : PICKER_SIZE.NORMAL.size / 2)}px;
  }
`;

const DEFAULT_OVERRIDE_COLOR = "rgba(255,255,255,1)";

// Parse color saved into topic settings into {r, g, b, a} form.
export function parseColorSetting(rgba: ?string, divisor?: number = 255) {
  const [r = 255, g = 255, b = 255, a = 1] = (rgba || "")
    .split(",")
    .map(parseFloat)
    .map((x) => (isNaN(x) ? undefined : x));
  return { r: r / divisor, g: g / divisor, b: b / divisor, a };
}

export function getRgbaColor(maybeHexColor: string): string {
  if (maybeHexColor && maybeHexColor.startsWith("#")) {
    const rgbaObj = tinyColor(maybeHexColor).toRgb();
    return `${rgbaObj.r},${rgbaObj.g},${rgbaObj.b},${rgbaObj.a}`;
  }
  return maybeHexColor;
}
export function getRgbaArray(maybeHexColor: string): number[] {
  if (maybeHexColor && maybeHexColor.startsWith("#")) {
    const rgbaObj = tinyColor(maybeHexColor).toRgb();
    return [rgbaObj.r, rgbaObj.g, rgbaObj.b, rgbaObj.a];
  }
  const arr = maybeHexColor.split(",");
  return [
    isNaN(arr[0]) ? 255 : +arr[0],
    isNaN(arr[1]) ? 255 : +arr[1],
    isNaN(arr[2]) ? 255 : +arr[2],
    isNaN(arr[3]) ? 1 : +arr[3],
  ];
}

export function getHexFromColorSettingWithDefault(color: ?string): string {
  const rgba = color ? parseColorSetting(color) : undefined;
  return rgba ? tinyColor.fromRatio(rgba).toRgbString() : DEFAULT_OVERRIDE_COLOR;
}

export default function ColorPickerForTopicSettings({ color, placement, onChange, size }: Props) {
  const isSmallSize = size && size === PICKER_SIZE.SMALL.name;
  return (
    <SWrapper isSmallSize={isSmallSize}>
      <ColorPicker
        animation="slide-up"
        color={getHexFromColorSettingWithDefault(color)}
        placement={placement}
        onChange={(newColor) => {
          const newRgbaColor = tinyColor(newColor.color)
            .setAlpha(newColor.alpha / 100)
            .toRgb();
          onChange(`${newRgbaColor.r},${newRgbaColor.g},${newRgbaColor.b},${newRgbaColor.a}`);
        }}
      />
    </SWrapper>
  );
}
