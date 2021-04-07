// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import * as React from "react";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const SCheckbox = styled.div`
  display: flex;
  align-items: center;
  flex-direction: ${(props) => (props.labelDirection === "top" ? "column" : "row")};
  align-items: ${(props) => (props.labelDirection === "top" ? "flex-start" : "center")};
  color: ${(props) => (props.disabled ? colors.GRAY : colors.LIGHT1)};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
`;

export const SLabel = styled.label`
  margin: ${(props) => (props.labelDirection === "top" ? "6px 6px 6px 0" : "6px")};
  color: ${(props) => (props.disabled || props.labelDirection === "top" ? colors.GRAY : colors.LIGHT1)};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
`;

export type Props = {
  checked: boolean,
  disabled?: boolean,
  label: string,
  labelStyle?: { [string]: string | number },
  labelDirection?: "top" | "left" | "right",
  tooltip?: string,
  onChange: (newChecked: boolean) => void,
  style?: { [string]: string | number },
  dataTest?: string,
};

export default function Checkbox({
  label,
  labelStyle,
  labelDirection = "right",
  checked,
  tooltip,
  onChange,
  disabled,
  style = {},
  dataTest,
}: Props) {
  const Component = checked ? CheckboxMarkedIcon : CheckboxBlankOutlineIcon;
  const onClick = React.useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [checked, disabled, onChange]);

  const styledLabel = (
    <SLabel labelDirection={labelDirection} disabled={disabled} style={labelStyle}>
      {label}
    </SLabel>
  );

  if (labelDirection === "top") {
    return (
      <SCheckbox disabled={disabled} labelDirection={labelDirection} style={style}>
        {styledLabel}
      </SCheckbox>
    );
  }

  return (
    <SCheckbox disabled={disabled} labelDirection={labelDirection} style={style} onClick={onClick} dataTest={dataTest}>
      {labelDirection === "left" && styledLabel}
      <Icon small tooltip={tooltip}>
        <Component />
      </Icon>
      {labelDirection === "right" && styledLabel}
    </SCheckbox>
  );
}
