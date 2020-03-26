// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import DragVerticalIcon from "@mdi/svg/svg/drag-vertical.svg";
import React from "react";
import { sortableHandle } from "react-sortable-hoc";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";

export const SDragHandle = styled.div`
  display: inline-flex;
  cursor: move;
  align-items: center;
  color: ${({ highlighted }) => (highlighted ? "white" : "unset")};
  opacity: ${({ highlighted }) => (highlighted ? 1 : 0.1)};
`;

export default sortableHandle(function DragHandle({ highlighted }: { highlighted: boolean }) {
  return (
    <SDragHandle highlighted={highlighted}>
      <Icon small>
        <DragVerticalIcon />
      </Icon>
    </SDragHandle>
  );
});
