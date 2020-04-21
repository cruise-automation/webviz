// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

const DEFAULT_COLOR = colors.LIGHT1;
const DISABLED_COLOR = tinyColor(colors.GRAY)
  .setAlpha(0.3)
  .toRgbString();
export const TOGGLE_WRAPPER_SIZE = 24;

export const TOGGLE_SIZE_CONFIG = {
  NORMAL: { name: "NORMAL", size: 12 },
  SMALL: { name: "SMALL", size: 8 },
};

const SToggle = styled.label`
  width: ${TOGGLE_WRAPPER_SIZE}px;
  height: ${TOGGLE_WRAPPER_SIZE}px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  > input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  > input:focus + span {
    border: 1px solid ${colors.BLUE} !important;
  }
`;

export type Size = $Keys<typeof TOGGLE_SIZE_CONFIG>;
type Props = {|
  checked: boolean,
  dataTestId?: string,
  onToggle: () => void,
  overrideColor?: ?string,
  size?: ?Size,
  visible: boolean,
|};

function getStyles({
  checked,
  visible,
  overrideColor,
  size,
}: {
  checked: boolean,
  visible: boolean,
  overrideColor: ?string,
  size: ?Size,
}): any {
  const sizeInNumber =
    size === TOGGLE_SIZE_CONFIG.SMALL.name ? TOGGLE_SIZE_CONFIG.SMALL.size : TOGGLE_SIZE_CONFIG.NORMAL.size;
  let styles = { width: sizeInNumber, height: sizeInNumber, borderRadius: sizeInNumber / 2 };

  const { enabledColor, disabledColor } = overrideColor
    ? {
        enabledColor: overrideColor,
        disabledColor: tinyColor(overrideColor)
          .setAlpha(0.5)
          .toRgbString(),
      }
    : { enabledColor: DEFAULT_COLOR, disabledColor: DISABLED_COLOR };

  const color = visible ? enabledColor : disabledColor;
  if (checked) {
    styles = { ...styles, background: color };
  } else {
    styles = { ...styles, border: `1px solid ${color}` };
  }

  return styles;
}

// A toggle component that supports using tab key to focus and using space key to check/uncheck.
export default function VisibilityToggle({ dataTestId, onToggle, checked, visible, overrideColor, size }: Props) {
  return (
    <SToggle>
      <input
        type="checkbox"
        checked={checked}
        {...(dataTestId ? { "data-test": dataTestId } : undefined)}
        onChange={() => onToggle()}
      />
      <span style={getStyles({ checked, visible, size, overrideColor })} />
    </SToggle>
  );
}
