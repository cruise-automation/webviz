// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import Item from "./Item";
import Menu from "./Menu";
import ChildToggle from "webviz-core/src/components/ChildToggle";

type State = {
  open: boolean,
};

type Props = {
  children: React.Node,
  text: React.Node,
  checked?: boolean,
  direction: "left" | "right",
  icon?: React.Node,
  style?: { [string]: any },
  dataTest?: string,
};

export default class SubMenu extends React.Component<Props, State> {
  _unmounted: boolean = false;

  state = {
    open: false,
  };

  static defaultProps = {
    checked: false,
    direction: "right",
  };

  toggle = () => {
    if (this._unmounted) {
      return;
    }
    this.setState(({ open }) => ({ open: !open }));
  };

  componentWillUnmount() {
    // the submenu might unmount on click, so don't update state if its gone
    this._unmounted = true;
  }

  render() {
    const { text, children, checked, direction, icon, dataTest, style } = this.props;
    const { open } = this.state;
    return (
      <ChildToggle
        noPortal
        position={direction === "left" ? "left" : "right"}
        onToggle={this.toggle}
        isOpen={open}
        style={style}
        dataTest={dataTest}>
        {/* Respect the check prop so that the open state doesn't overwrite the check state.  */}
        <Item hasSubMenu direction={direction} checked={checked ?? open} icon={icon}>
          {text}
        </Item>
        <Menu>{children}</Menu>
      </ChildToggle>
    );
  }
}
