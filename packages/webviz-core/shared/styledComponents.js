// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import styled from "styled-components";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const SLinkUnderline = styled.span`
  color: ${colors.BLUE};
  cursor: pointer;

  &:hover {
    color: ${colors.BLUE};
    text-decoration: underline;
  }
`;
