// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

const SGlobalVariableName = styled.span`
  color: #ccb862;
  font-weight: bold;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: ${(props) => (props.leftPadding ? "6px" : 0)};
`;

export default function GlobalVariableName({ name, leftPadding }: {| name: string, leftPadding?: boolean |}) {
  return (
    <SGlobalVariableName title={name} leftPadding={leftPadding}>
      ${name}
    </SGlobalVariableName>
  );
}
