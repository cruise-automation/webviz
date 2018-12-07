//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from 'react';
import styled from 'styled-components';
const Wrapper = styled.span`
  padding: 4px 8px;
  display: inline-flex;
  flex-direction: column;
  min-width: 120px;
`;

const Label = styled.label`
  display: inline-block;
  margin-bottom: 0;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
`;

export default function InputNumber({ value, onChange, min = 0.5, max = 20, step = 0.1, label = '', horizontal }) {
  return (
    <Wrapper
      style={
        horizontal
          ? {
              alignItems: 'baseline',
              flexDirection: 'row',
            }
          : {}
      }>
      <Label style={{ display: 'inline-block', marginRight: 4 }}>{label}</Label>
      <input
        type="number"
        name="scaleX"
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
    </Wrapper>
  );
}
