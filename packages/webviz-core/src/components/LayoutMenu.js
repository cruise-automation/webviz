// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import AppsIcon from "@mdi/svg/svg/apps.svg";
import JsonIcon from "@mdi/svg/svg/json.svg";
import ScriptTextOutlineIcon from "@mdi/svg/svg/script-text-outline.svg";
import React, { PureComponent } from "react";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu, { Item } from "webviz-core/src/components/Menu";

type Props = {
  onImportSelect: () => void,
};

type State = {
  isOpen: boolean,
};

export default class LayoutMenu extends PureComponent<Props, State> {
  state = {
    isOpen: false,
  };

  onToggle = () => {
    this.setState({ isOpen: !this.state.isOpen });
  };

  onImportClick = () => {
    const { onImportSelect } = this.props;
    this.setState({ isOpen: false });
    onImportSelect();
  };

  render() {
    const { isOpen } = this.state;

    return (
      <ChildToggle position="below" onToggle={this.onToggle} isOpen={isOpen}>
        <Icon small fade active={isOpen}>
          <AppsIcon />
        </Icon>
        <Menu>
          <Item icon={<JsonIcon />} onClick={this.onImportClick}>
            Import/export layout
          </Item>
          <hr />
          <Item
            icon={<ScriptTextOutlineIcon />}
            onClick={() => window.open("https://github.com/cruise-automation/webviz/blob/master/LICENSE", "_blank")}>
            License
          </Item>
        </Menu>
      </ChildToggle>
    );
  }
}
