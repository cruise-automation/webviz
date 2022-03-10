// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import styled from "styled-components";

import DashArrayLine from "./DashArrayLine";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SDiv = styled.div`
  width: 200px;
  height: 40px;
  margin: 8px;
`;

const defaultProps = {
  borderDash: undefined,
  borderWidth: 1,
  stroke: colors.RED,
};

storiesOf("<DashArrayLine>", module)
  .add("borderDash", () => {
    return (
      <SDiv>
        {[[1, 1], [4, 4], [10, 10], [2, 10]].map((borderDash, i) => (
          <DashArrayLine key={i} {...{ ...defaultProps, borderDash }} style={{ background: colors.DARK3 }} />
        ))}
      </SDiv>
    );
  })
  .add("borderWidth", () => {
    return (
      <SDiv>
        {[0.5, 1, 2, 4].map((borderWidth, i) => (
          <DashArrayLine key={i} {...{ ...defaultProps, borderWidth }} style={{ background: colors.DARK3 }} />
        ))}
      </SDiv>
    );
  })
  .add("stroke", () => {
    return (
      <SDiv>
        {[colors.RED, colors.GREEN, colors.BLUE].map((stroke, i) => (
          <DashArrayLine key={i} {...{ ...defaultProps, stroke }} style={{ background: colors.DARK3 }} />
        ))}
      </SDiv>
    );
  });
