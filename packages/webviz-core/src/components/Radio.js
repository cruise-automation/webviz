// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import RadioButtonUncheckedIcon from "@mdi/svg/svg/radiobox-blank.svg";
import RadioButtonCheckedIcon from "@mdi/svg/svg/radiobox-marked.svg";
import * as React from "react";
import styled from "styled-components";

import Icon from "./Icon";
import { colorToAlpha } from "./SegmentedControl";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export type RadioOption = {
  id: string,
  label: React.Node,
};

export type RadioProps = {
  options: RadioOption[],
  selectedId?: string,
  onChange: (selectedId: string) => void,
};

const SOption = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  outline: 0;
  &:not(:last-child) {
    margin-bottom: 8px;
  }
  > .icon svg {
    flex: none;
    transition: all 80ms ease-in-out;
    border-radius: 50%;
  }
  &:hover {
    > .icon svg {
      opacity: 0.8;
    }
  }
  &:focus-within,
  &:focus,
  &:active {
    > .icon svg {
      box-shadow: 0 0 0 2px ${colorToAlpha(colors.LIGHT, 0.2)};
    }
  }
`;
const SLabel = styled.div`
  margin-left: 8px;
`;

export default function Radio(props: RadioProps): React.Node {
  const { options, selectedId, onChange, ...restProps } = props;
  return options.map(({ id, label }: RadioOption) => (
    <SOption tabIndex={0} key={id} data-test={id} onClick={() => onChange(id)} {...restProps}>
      <Icon small>{id === selectedId ? <RadioButtonCheckedIcon /> : <RadioButtonUncheckedIcon />}</Icon>
      <SLabel>{label}</SLabel>
    </SOption>
  ));
}
