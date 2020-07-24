// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

export const SCREENSHOT_VIEWPORT = {
  width: 1001,
  height: 745,
};

export const ScreenshotSizedContainer = (props: { children: React.Node }) => (
  <div style={SCREENSHOT_VIEWPORT}>{props.children}</div>
);

export const SExpectedResult = styled.div`
  position: fixed;
  top: 25px;
  left: 0;
  color: lightgreen;
  margin: 16px;
  z-index: 1000;
`;
