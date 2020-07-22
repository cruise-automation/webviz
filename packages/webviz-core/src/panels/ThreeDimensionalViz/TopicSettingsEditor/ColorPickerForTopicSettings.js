// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ColorPicker, { Panel as ColorPickerPanel } from "rc-color-picker";
import React from "react";
import { type Color } from "regl-worldview";
import styled from "styled-components";
import tinyColor from "tinycolor2";

export const PICKER_SIZE = {
  NORMAL: { name: "NORMAL", size: 24 },
  SMALL: { name: "SMALL", size: 16 },
};

export type Size = $Keys<typeof PICKER_SIZE>;
type Placement = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

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

export function getHexFromColorSettingWithDefault(color: ?Color): string {
  return color ? tinyColor.fromRatio(color).toRgbString() : DEFAULT_OVERRIDE_COLOR;
}

type Props = {|
  color: ?Color,
  onChange: (newColor: Color) => void,
  placement?: Placement,
  size?: ?Size,
  useModal?: boolean,
|};
type ColorPickerSettingsPanelProps = {|
  color: ?string,
  onChange: (newColor: Color) => void,
|};

function getRGBAFromColor(color: { color: string, alpha: number }): Color {
  const rgbaColor = tinyColor(color.color)
    .setAlpha(color.alpha / 100)
    .toRgb();
  return {
    r: rgbaColor.r / 255,
    g: rgbaColor.g / 255,
    b: rgbaColor.b / 255,
    a: rgbaColor.a,
  };
}
// A tiny wrapper to set up the default handling of color and onChange for ColorPickerPanel.
export function ColorPickerSettingsPanel({ color, onChange }: ColorPickerSettingsPanelProps) {
  const hexColor = getHexFromColorSettingWithDefault(color);
  return (
    <ColorPickerPanel
      enableAlpha
      color={hexColor}
      onChange={(newColor: { color: string, alpha: number }) => onChange(getRGBAFromColor(newColor))}
      mode="RGB"
    />
  );
}

export default function ColorPickerForTopicSettings({ color, placement, onChange, size }: Props) {
  const isSmallSize = !!(size && size === PICKER_SIZE.SMALL.name);
  const hexColor = getHexFromColorSettingWithDefault(color);

  return (
    <SWrapper isSmallSize={isSmallSize}>
      <ColorPicker
        animation="slide-up"
        color={hexColor}
        placement={placement}
        onChange={(newColor: { color: string, alpha: number }) => onChange(getRGBAFromColor(newColor))}
      />
    </SWrapper>
  );
}
