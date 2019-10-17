// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import * as React from "react";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";
import { colors } from "webviz-core/src/util/colors";

export const SCheckbox = styled.div`
  display: flex;
  align-items: center;
  flex-direction: ${(props) => (props.isVertical ? "column" : "row")};
  align-items: ${(props) => (props.isVertical ? "flex-start" : "center")};
  color: ${(props) => (props.disabled ? colors.GRAY : colors.LIGHT1)};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
`;

export const SLabel = styled.label`
  margin: 6px;
  margin: ${(props) => (props.isVertical ? "6px 6px 6px 0" : "6px")};
  color: ${(props) => (props.disabled || props.isVertical ? colors.GRAY : colors.LIGHT1)};
`;

export type Props = {
  checked: boolean,
  disabled?: boolean,
  label: string,
  tooltip?: string,
  onChange: (newChecked: boolean) => void,
  isVertical?: boolean,
  style?: { [string]: string | number },
};

export default function Checkbox({ label, checked, tooltip, onChange, disabled, isVertical, style = {} }: Props) {
  const Component = checked ? CheckboxMarkedIcon : CheckboxBlankOutlineIcon;
  const onClick = React.useCallback(
    () => {
      if (!disabled) {
        onChange(!checked);
      }
    },
    [checked, disabled, onChange]
  );

  return (
    <SCheckbox disabled={disabled} isVertical={isVertical} style={style}>
      {isVertical && (
        <SLabel isVertical={isVertical} disabled={disabled}>
          {label}
        </SLabel>
      )}
      <Icon small tooltip={tooltip} onClick={onClick}>
        <Component />
      </Icon>
      {!isVertical && <SLabel disabled={disabled}>{label}</SLabel>}
    </SCheckbox>
  );
}
