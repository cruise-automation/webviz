//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import { fontFamily } from "./theme";

const StyledInput = styled.label`
  display: inline-flex;
  flex-direction: column;
  width: 100%;
  margin: 0 8px 6px 0;

  div {
    display: inline-block;
    margin-bottom: 4px;
    font-size: 0.75rem;
  }

  input {
    appearance: none;
    background: black;
    border-radius: 3px;
    border: 0;
    outline: 0;
    color: white;
    font-size: 0.9rem !important;
    padding: 2px 5px;
    font-family: ${fontFamily.primary};
  }
`;

export default function InputNumber({ value, onChange, min = 0.5, max = 20, step = 0.1, label = "", horizontal }) {
  return (
    <StyledInput
      style={
        horizontal
          ? {
              alignItems: "baseline",
              flexDirection: "row",
            }
          : {}
      }>
      <div className="monospace">{label}</div>
      <input
        type="number"
        name="scaleX"
        className="monospace"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(ev) => {
          let newVal = +ev.target.value;
          newVal = Math.max(Math.min(newVal, max), min);
          onChange(newVal);
        }}
      />
    </StyledInput>
  );
}
