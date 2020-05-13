// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const TOPIC_ROW_PADDING = 3;

const DEFAULT_COLOR = colors.LIGHT1;
export const DISABLED_COLOR = colors.DISABLED;
export const TOGGLE_WRAPPER_SIZE = 24;

export const TOGGLE_SIZE_CONFIG = {
  NORMAL: { name: "NORMAL", size: 12 },
  SMALL: { name: "SMALL", size: 8 },
};

const SToggle = styled.label`
  width: ${TOGGLE_WRAPPER_SIZE}px;
  height: ${TOPIC_ROW_PADDING * 2 + TOGGLE_WRAPPER_SIZE}px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  :focus {
    span {
      border: 1px solid ${colors.BLUE} !important;
    }
  }
`;

const SSpan = styled.span`
  :hover {
    transform: scale(1.2);
  }
`;

export type Size = $Keys<typeof TOGGLE_SIZE_CONFIG>;
type Props = {|
  checked: boolean,
  dataTest?: string,
  onToggle: () => void,
  onAltToggle?: () => void,
  onShiftToggle?: () => void,
  overrideColor?: ?string,
  size?: ?Size,
  visibleInScene: boolean,
|};

function getStyles({
  checked,
  visibleInScene,
  overrideColor,
  size,
}: {
  checked: boolean,
  visibleInScene: boolean,
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

  const color = visibleInScene ? enabledColor : disabledColor;
  if (checked) {
    styles = { ...styles, background: color };
  } else {
    styles = { ...styles, border: `1px solid ${color}` };
  }

  return styles;
}

// A toggle component that supports using tab key to focus and using space key to check/uncheck.
export default function VisibilityToggle({
  dataTest,
  onToggle,
  onAltToggle,
  onShiftToggle,
  checked,
  visibleInScene,
  overrideColor,
  size,
}: Props) {
  // Handle shift + click/enter, option + click/enter, and click/enter.
  const onChange = useCallback(
    (e: MouseEvent | KeyboardEvent) => {
      if (onShiftToggle && e.shiftKey) {
        onShiftToggle();
      } else if (onAltToggle && e.altKey) {
        onAltToggle();
      } else {
        onToggle();
      }
    },
    [onAltToggle, onShiftToggle, onToggle]
  );
  return (
    <SToggle
      data-test={dataTest}
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter") {
          onChange(e);
        }
      }}
      onClick={(e: MouseEvent) => onChange(e)}>
      <SSpan style={getStyles({ checked, visibleInScene, size, overrideColor })} />
    </SToggle>
  );
}
