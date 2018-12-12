// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

const StyledSwitchWrapper = styled.div`
  display: inline-flex;
  align-items: center;
`;
const StyledSwitch = styled.label`
  position: relative;
  display: block;
  width: 30px;
  height: 18px;
  user-select: none;
  margin: 0;
`;

const StyledSlider = styled.span`
  position: absolute;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: 0.4s;
  transition: 0.4s;
  border-radius: 9px;
  &:before {
    position: absolute;
    content: "";
    height: 12px;
    width: 12px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    -webkit-transition: 0.4s;
    transition: 0.4s;
    border-radius: 50%;
  }
`;

const StyledInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  &:checked + ${StyledSlider} {
    background-color: #23d160;
  }
  &:checked + ${StyledSlider}:before {
    -webkit-transform: translateX(12px);
    -ms-transform: translateX(12px);
    transform: translateX(12px);
  }
  &:disabled + ${StyledSlider} {
    background-color: #efefef;
  }
  &:checked:disabled + ${StyledSlider} {
    background-color: #23d16099;
  }
`;

type Props = {
  on: boolean,
  disabled?: boolean,
  onChange: SyntheticInputEvent<HTMLInputElement>,
  renderText?: (on: boolean) => React.Node,
  label?: string,
};

export default function Switch({ on, onChange, label, disabled, renderText }: Props) {
  return (
    <StyledSwitchWrapper>
      <StyledSwitch>
        <StyledInput disabled={disabled} type="checkbox" checked={on} onChange={disabled ? undefined : onChange} />
        <StyledSlider disabled={disabled} />
      </StyledSwitch>
      {label && <span style={{ margin: "0 0.5rem" }}>{label} </span>}
      {renderText && renderText(on)}
    </StyledSwitchWrapper>
  );
}
