// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ClipboardOutlineIcon from "@mdi/svg/svg/clipboard-outline.svg";
import * as React from "react";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";
import clipboard from "webviz-core/src/util/clipboard";

const IconWrapper = styled.div`
  vertical-align: middle;
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0;
`;

const Wrapper = styled.div`
  position: relative;
  cursor: pointer;
  &:hover {
    ${IconWrapper} {
      opacity: 1;
    }
  }
`;

type Props = {
  children: React.Node,
  styles: any,
  copyValue?: any,
};

class CopyToClipboardComponent extends React.Component<Props> {
  wrapper: ?HTMLDivElement;
  copy = () => {
    if (this.wrapper) {
      const copyValue =
        typeof this.props.copyValue === "string" ? this.props.copyValue : JSON.stringify(this.props.copyValue);

      const value = copyValue || this.wrapper.innerText || "";
      clipboard.copy(value);
    }
  };
  render() {
    return (
      <Wrapper
        style={this.props.styles}
        onClick={this.copy}
        ref={(wrapper) => {
          this.wrapper = wrapper;
        }}>
        {this.props.children}
        <IconWrapper>
          <Icon>
            <ClipboardOutlineIcon />
          </Icon>
        </IconWrapper>
      </Wrapper>
    );
  }
}

export default CopyToClipboardComponent;
