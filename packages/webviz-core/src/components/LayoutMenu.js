// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import AppsIcon from "@mdi/svg/svg/apps.svg";
import JsonIcon from "@mdi/svg/svg/json.svg";
import NukeIcon from "@mdi/svg/svg/nuke.svg";
import ScriptTextOutlineIcon from "@mdi/svg/svg/script-text-outline.svg";
import React, { PureComponent } from "react";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import { openLayoutModal } from "webviz-core/src/components/LayoutModal";
import Menu, { Item } from "webviz-core/src/components/Menu";
import clearIndexedDb from "webviz-core/src/util/indexeddb/clearIndexedDb";

type State = {
  isOpen: boolean,
};

export default class LayoutMenu extends PureComponent<{}, State> {
  state = {
    isOpen: false,
  };

  _onToggle = () => {
    this.setState({ isOpen: !this.state.isOpen });
  };

  _onImportClick = () => {
    this.setState({ isOpen: false });
    openLayoutModal();
  };

  render() {
    const { isOpen } = this.state;

    return (
      <ChildToggle position="below" onToggle={this._onToggle} isOpen={isOpen}>
        <Icon small fade active={isOpen}>
          <AppsIcon />
        </Icon>
        <Menu>
          <Item icon={<JsonIcon />} onClick={this._onImportClick}>
            Import/export layout
          </Item>
          <Item icon={<NukeIcon />} onClick={clearIndexedDb}>
            Clear bag cache
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
