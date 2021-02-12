// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const colorToAlpha = (hex: string, alpha: number) => {
  const color = tinyColor(hex);
  color.setAlpha(alpha);
  return color.toRgbString();
};

const SSegmentedControl = styled.div`
  display: inline-flex;
  padding: 4px;
  border-radius: 6px;
  background-color: ${colorToAlpha(colors.LIGHT, 0.15)};
  outline: 0;
  &:focus-within,
  &:focus,
  &:active {
    box-shadow: inset 0 0 0 2px ${colorToAlpha(colors.LIGHT, 0.1)};
  }
`;

const SOption = styled.div`
  flex: none;
  cursor: pointer;
  transition: all 80ms ease-in-out;
  border-radius: 4px;
  background-color: ${(props) => (props.isSelected ? colors.PRIMARY : "transparent")};
  color: ${(props) => (props.isSelected ? colors.LIGHT : colors.LIGHT)};
  padding: 8px 16px;
  &:hover {
    opacity: 0.8;
  }
`;

export type Option = {|
  id: string,
  label: string,
|};

type Props = {|
  options: Option[],
  selectedId: string,
  onChange: (id: string) => void,
|};

export default function SegmentedControl({ options, selectedId, onChange }: Props) {
  if (options.length === 0) {
    throw new Error("<SegmentedControl> requires at least one option");
  }

  return (
    <SSegmentedControl tabIndex={0}>
      {options.map(({ id, label }) => (
        <SOption key={id} data-test={id} onClick={() => onChange(id)} isSelected={selectedId === id}>
          {label}
        </SOption>
      ))}
    </SSegmentedControl>
  );
}
