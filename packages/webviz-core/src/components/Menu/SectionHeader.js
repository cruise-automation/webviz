// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import styled from "styled-components";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SectionHeader = styled.div`
  color: ${colors.LIGHT};
  opacity: 0.4;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 500;
  padding: 16px;
  user-select: none;
`;

export default SectionHeader;
