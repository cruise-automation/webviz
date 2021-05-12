// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

type Props = {|
  children: React.Node,
  alignLeft?: boolean,
|};

const Container = styled.div`
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.alignLeft ? "left" : "center")};
  margin: 20px;
  line-height: 1.4;
  color: ${colors.GRAY};

  code {
    color: ${colors.DARK9};
    background: transparent;
    padding: 0;
  }
`;

export default class EmptyState extends React.Component<Props> {
  render() {
    return (
      <Container alignLeft={this.props.alignLeft}>
        <div>{this.props.children}</div>
      </Container>
    );
  }
}
