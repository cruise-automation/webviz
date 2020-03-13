// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

// TODO(Audrey): change opacity to higher after implementing keyboard jump to focus row
const SKeyboardFocusIndex = styled.span`
  opacity: 0;
  position: absolute;
  left: 6px;
`;

type Props = {|
  highlighted: boolean,
  keyboardFocusIndex: number,
|};

export default function KeyboardFocusIndex({ keyboardFocusIndex, highlighted }: Props) {
  return <SKeyboardFocusIndex highlighted={highlighted}>{keyboardFocusIndex}</SKeyboardFocusIndex>;
}
