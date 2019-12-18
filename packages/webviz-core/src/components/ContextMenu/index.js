// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Tooltip from "@cruise-automation/tooltip";
import * as React from "react";

import Menu from "webviz-core/src/components/Menu";

type Props = {
  children: React.Node,
};

// a tiny wrapper around the tooltip component that automatically
// hides on the next mouse click so you don't have to manage window listeners yourself
export default class ContextMenu extends React.Component<Props> {
  static show(x: number, y: number, contents: React.Node) {
    Tooltip.show(x, y, <ContextMenu>{contents}</ContextMenu>);
  }

  componentDidMount() {
    window.addEventListener("click", this.hide);
  }

  hide = () => {
    window.removeEventListener("click", this.hide);
    Tooltip.hide();
  };

  render() {
    return <Menu>{this.props.children}</Menu>;
  }
}
