// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import { color } from "./theme";

const SliderInput = styled.input.attrs({ type: "range" })`
  width: 120px;
  margin-right: 20px;
  appearance: none;
  background: transparent;
  &:focus {
    outline: 0;
  }
  &::-webkit-slider-thumb {
    appearance: none;
    height: 12px;
    width: 28px;
    border-radius: 6px;
    background: ${color.primary};
    cursor: pointer;
    &:hover {
      opacity: 0.5;
    }
  }
  &::-webkit-slider-runnable-track {
    width: 100%;
    height: 16px;
    cursor: pointer;
    background: transparent;
    border: 1px solid ${color.primary};
    border-radius: 8px;
    padding: 1px;
  }
`;

const SWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const SEndpoint = styled.span`
  font-size: 14px;
  margin-left: 8px;
  margin-right: 8px;
`;

type Props = {
  onChange: (number) => void,
  min?: number,
  max?: number,
  minLabel: boolean | string,
  maxLabel: boolean | string,
};

export { SWrapper, SEndpoint };

export default function Slider({ onChange, minLabel, maxLabel, ...props }: Props) {
  return (
    <SWrapper>
      {minLabel && <SEndpoint>{typeof minLabel === "string" ? minLabel : props.min}</SEndpoint>}
      <SliderInput {...props} onChange={(e) => onChange(+e.target.value)} />
      {maxLabel && <SEndpoint>{typeof maxLabel === "string" ? maxLabel : props.max}</SEndpoint>}
    </SWrapper>
  );
}
