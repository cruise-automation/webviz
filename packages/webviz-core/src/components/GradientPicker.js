// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";
import styled from "styled-components";

import ColorPicker, { COLOR_PICKER_SIZE } from "./ColorPicker";
import AutoSizingCanvas from "webviz-core/src/components/AutoSizingCanvas";
import { colors } from "webviz-core/src/util/colors";

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
  minColorRefForTesting,
  maxColorRefForTesting,
}: {
  minColor: string,
  maxColor: string,
  onChange: ({ minColor: string, maxColor: string }) => void,
  maxColorRefForTesting?: any,
  minColorRefForTesting?: any,
}) {
  const drawGradient = useCallback(
    (ctx, width, height) => {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, minColor);
      gradient.addColorStop(1, maxColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    },
    [maxColor, minColor]
  );

  return (
    <>
      <SPickerWrapper>
        <ColorPicker
          ref={minColorRefForTesting}
          color={minColor}
          onChange={useCallback((newColor) => onChange({ minColor: newColor, maxColor }), [maxColor, onChange])}
        />
        <ColorPicker
          ref={maxColorRefForTesting}
          color={maxColor}
          onChange={useCallback((newColor) => onChange({ minColor, maxColor: newColor }), [minColor, onChange])}
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
