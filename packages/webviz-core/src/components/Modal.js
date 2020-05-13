// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CloseIcon from "@mdi/svg/svg/close.svg";
import * as React from "react";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";
import KeyListener from "webviz-core/src/components/KeyListener";
import colors from "webviz-core/src/styles/colors.module.scss";

// Generic modal that renders a semi-transparent backdrop and close icon.
// Should be opened using `renderInBody` so it sits on top of everything
// (except in stories, where there is nothing to render on top of).

export const Title = styled.h3`
  padding-bottom: 16px;
  color: ${colors.textBright};
  font-size: 22px;
  line-height: 1.4;
`;

const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledMask = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  opacity: 0.75;
  background-color: black;
  width: 100%;
  height: 100%;
`;

const StyledContent = styled.div`
  position: absolute;
  flex: 1 1 auto;
`;

type Props = {|
  children: React.Node,
  onRequestClose: () => void,
  contentStyle?: { [string]: any },
|};

export default class Modal extends React.PureComponent<Props> {
  render() {
    return (
      <Container
        ref={(el) => {
          if (
            el &&
            el.parentElement &&
            el.parentElement.dataset.modalcontainer !== "true" &&
            // These two are for when directly rendering in storybook:
            el.parentElement.id !== "root" &&
            el.parentElement.parentElement.id !== "root"
          ) {
            throw new Error("`<Modal>` must be rendered using `renderToBody()` or `RenderToBodyComponent`.");
          }
        }}>
        <StyledMask onClick={this.props.onRequestClose} />
        <StyledContent
          style={{
            borderRadius: 6,
            backgroundColor: colors.panelBackground,
            ...this.props.contentStyle,
          }}>
          <KeyListener global keyDownHandlers={{ Escape: this.props.onRequestClose }} />
          <Icon
            fade
            dataTest="modal-close-icon"
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              cursor: "pointer",
              fontSize: 20,
            }}
            onClick={this.props.onRequestClose}>
            <CloseIcon />
          </Icon>
          {this.props.children}
        </StyledContent>
      </Container>
    );
  }
}
