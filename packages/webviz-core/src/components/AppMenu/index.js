// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PlusBoxIcon from "@mdi/svg/svg/plus-box.svg";
import React, { Component } from "react";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import PanelList from "webviz-core/src/panels/PanelList";

type Props = {|
  onPanelSelect: (panelType: string) => void,
  defaultIsOpen?: boolean, // just for testing
|};

type State = {| isOpen: boolean |};

export default class AppMenu extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { isOpen: props.defaultIsOpen || false };
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return nextState.isOpen !== this.state.isOpen;
  }

  onToggle = () => {
    const { isOpen } = this.state;
    this.setState({ isOpen: !isOpen });
  };

  render() {
    const { isOpen } = this.state;
    return (
      <ChildToggle position="below" onToggle={this.onToggle} isOpen={isOpen}>
        <Icon small fade active={isOpen} tooltip="Add Panel">
          <PlusBoxIcon />
        </Icon>
        <Menu>
          {/* $FlowFixMe - not sure why it thinks onPanelSelect is a Redux action */}
          <PanelList onPanelSelect={this.props.onPanelSelect} />
        </Menu>
      </ChildToggle>
    );
  }
}
