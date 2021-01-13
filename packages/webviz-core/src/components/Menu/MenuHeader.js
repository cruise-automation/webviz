// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import styled from "styled-components";

import { colors, textSize } from "webviz-core/src/util/sharedStyleConstants";

const MenuHeader = styled.div`
  color: ${colors.LIGHT};
  font-size: ${textSize.LARGE};
  padding: 16px;
  user-select: none;
  display: flex;
  align-items: center;
`;

export default MenuHeader;
