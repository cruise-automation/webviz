// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import styled from "styled-components";

export const SLabel = styled.label`
  display: block;
  font-size: 14px;
  margin: 6px 2px;
  text-decoration: ${(props) => (props.strikethrough ? "line-through" : null)};
`;
export const SDescription = styled.label`
  display: block;
  margin: 6px 2px;
  opacity: 0.8;
  line-height: 1.2;
`;

export const SInput = styled.input`
  flex: 1 1 auto;
  margin-bottom: 8px;
`;
