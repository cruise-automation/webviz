// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import AppsIcon from "@mdi/svg/svg/apps.svg";
import BorderAllIcon from "@mdi/svg/svg/border-all.svg";
import FlagVariantIcon from "@mdi/svg/svg/flag-variant.svg";
import JsonIcon from "@mdi/svg/svg/json.svg";
import ScriptTextOutlineIcon from "@mdi/svg/svg/script-text-outline.svg";
import React, { PureComponent } from "react";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import { ExperimentalFeaturesModal } from "webviz-core/src/components/ExperimentalFeatures";
import Icon from "webviz-core/src/components/Icon";
import { openLayoutModal } from "webviz-core/src/components/LayoutModal";
import Menu, { Item } from "webviz-core/src/components/Menu";
import renderToBody from "webviz-core/src/components/renderToBody";
import { ClearBagCacheMenuItem } from "webviz-core/src/util/indexeddb/clearIndexedDb";

type State = {
  isOpen: boolean,
};

type Props = {
  redoLayoutChange: () => void,
  redoStateCount: number,
  undoLayoutChange: () => void,
  undoStateCount: number,
  selectAllPanels: () => void,
};

export default class LayoutMenu extends PureComponent<Props, State> {
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

  _onExperimentalFeaturesClick = () => {
    this.setState({ isOpen: false });
    const modal = renderToBody(<ExperimentalFeaturesModal onRequestClose={() => close()} />);
    function close() {
      modal.remove();
    }
  };

  render() {
    const { isOpen } = this.state;
    const { redoLayoutChange, redoStateCount, undoLayoutChange, undoStateCount } = this.props;
    const redoDisabled = redoStateCount === 0;
    const undoDisabled = undoStateCount === 0;

    const mac = navigator.userAgent.includes("Mac OS");
    const cmd = mac ? "⌘" : "ctrl+";
    const shift = mac ? "⇧" : "shift+";

    return (
      <ChildToggle position="below" onToggle={this._onToggle} isOpen={isOpen}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Icon small fade active={isOpen} tooltip="Config">
            <AppsIcon />
          </Icon>
        </div>
        <Menu>
          <Item icon={<JsonIcon />} onClick={this._onImportClick}>
            Import/export layout
          </Item>
          <Item icon={<BorderAllIcon />} onClick={this.props.selectAllPanels}>
            Select all panels
          </Item>
          <Item icon="⟲" tooltip={`Undo (${cmd}Z)`} onClick={undoLayoutChange} disabled={undoDisabled}>
            Undo change
            <small>{` (${undoStateCount})`}</small>
          </Item>
          <Item icon="⟳" tooltip={`Redo (${cmd}${shift}Z)`} onClick={redoLayoutChange} disabled={redoDisabled}>
            Redo change
            <small>{` (${redoStateCount})`}</small>
          </Item>
          <Item icon={<FlagVariantIcon />} onClick={this._onExperimentalFeaturesClick}>
            Experimental Features
          </Item>
          <ClearBagCacheMenuItem />
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
