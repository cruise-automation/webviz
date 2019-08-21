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

export const SCheckbox = styled.div`
  display: flex;
  align-items: center;
`;
export const SLabel = styled.label`
  margin: 6px;
`;

export type Props = {
  checked: boolean,
  label: string,
  tooltip?: string,
  onChange: (newChecked: boolean) => void,
};

export default function Checkbox({ label, checked, tooltip, onChange }: Props) {
  const Component = checked ? CheckboxMarkedIcon : CheckboxBlankOutlineIcon;
  return (
    <SCheckbox>
      <Icon small tooltip={tooltip} onClick={() => onChange(!checked)}>
        <Component />
      </Icon>
      <SLabel>{label}</SLabel>
    </SCheckbox>
  );
}
