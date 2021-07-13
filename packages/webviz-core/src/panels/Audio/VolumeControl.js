// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import VolumeHigh from "@mdi/svg/svg/volume-high.svg";
import VolumeLow from "@mdi/svg/svg/volume-low.svg";
import * as React from "react";
import styled from "styled-components";

import Tooltip from "webviz-core/src/components/Tooltip";
import { hexToRgbString } from "webviz-core/src/util/colorUtils";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const light60 = hexToRgbString(colors.LIGHT1, 0.6);

const SWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const SliderInput = styled.input.attrs({ type: "range" })`
  width: 100%;
  appearance: none;
  background: transparent;
  &:focus {
    outline: 0;
    background: transparent;
  }
  &::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 8px;
    background: ${colors.LIGHT1};
    margin-top: -4px;
    cursor: pointer;
    &:hover {
      opacity: 0.9;
    }
  }
  &::-webkit-slider-runnable-track {
    width: 100%;
    background: ${light60};
    height: 6px;
    border-radius: 3px;
    cursor: pointer;
  }
`;

type Props = {
  onChange: (number) => void,
  value: number,
  min?: number,
  max?: number,
  step?: number,
  rootStyle?: { [string]: number | string },
  iconStyle?: { [string]: number | string },
};

export default function VolumeControl({
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  value,
  rootStyle = {},
  iconStyle = {
    fill: light60,
    width: 24,
    height: 24,
  },
  ...rest
}: Props) {
  return (
    <SWrapper style={rootStyle}>
      <VolumeLow {...iconStyle} />
      <Tooltip contents={`volume: ${value}`} placement="top">
        <div>
          <SliderInput
            min={min}
            max={max}
            step={step}
            value={value}
            {...rest}
            onChange={(e) => onChange(+e.target.value)}
          />
        </div>
      </Tooltip>
      <VolumeHigh {...iconStyle} />
    </SWrapper>
  );
}
