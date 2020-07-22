// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";
import { type Color } from "regl-worldview";
import styled from "styled-components";

import AutoSizingCanvas from "webviz-core/src/components/AutoSizingCanvas";
import ColorPickerForTopicSettings, {
  PICKER_SIZE,
  getHexFromColorSettingWithDefault,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/ColorPickerForTopicSettings";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const COLOR_PICKER_SIZE = PICKER_SIZE.NORMAL.size;
const GRADIENT_BAR_INSET = Math.floor(COLOR_PICKER_SIZE / 2);
const GRADIENT_BAR_HEIGHT = 10;
const GRADIENT_LINE_HEIGHT = 6;

const SPickerWrapper = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;
const SBarWrapper = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  margin-left: ${GRADIENT_BAR_INSET}px;
  margin-right: ${GRADIENT_BAR_INSET}px;
`;
const SLine = styled.div`
  flex: 0 0 auto;
  width: 1px;
  height: ${GRADIENT_BAR_HEIGHT + GRADIENT_LINE_HEIGHT}px;
  background-color: ${colors.LIGHT2};
`;
const SBar = styled.div`
  flex: 1 1 auto;
  height: ${GRADIENT_BAR_HEIGHT}px;
`;

export default function GradientPicker({
  minColor,
  maxColor,
  onChange,
}: {
  minColor: Color,
  maxColor: Color,
  onChange: ({ minColor: Color, maxColor: Color }) => void,
}) {
  const hexMinColor = getHexFromColorSettingWithDefault(minColor);
  const hexMaxColor = getHexFromColorSettingWithDefault(maxColor);

  const drawGradient = useCallback(
    (ctx, width, height) => {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, hexMinColor);
      gradient.addColorStop(1, hexMaxColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    },
    [hexMaxColor, hexMinColor]
  );

  return (
    <>
      <SPickerWrapper>
        <ColorPickerForTopicSettings
          color={minColor}
          onChange={(newColor) => onChange({ minColor: newColor, maxColor })}
        />
        <ColorPickerForTopicSettings
          color={maxColor}
          onChange={(newColor) => onChange({ minColor, maxColor: newColor })}
        />
      </SPickerWrapper>
      <SBarWrapper>
        <SLine />
        <SBar>
          <AutoSizingCanvas draw={drawGradient} />
        </SBar>
        <SLine />
      </SBarWrapper>
    </>
  );
}
