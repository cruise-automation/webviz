// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PlusBoxIcon from "@mdi/svg/svg/plus-box.svg";
import { isEmpty } from "lodash";
import React, { Component } from "react";
import { connect } from "react-redux";

import { changePanelLayout, savePanelConfigs } from "webviz-core/src/actions/panels";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import PanelList, { type PanelSelection } from "webviz-core/src/panels/PanelList";
import type { State as ReduxState } from "webviz-core/src/reducers";
import type { PanelsState } from "webviz-core/src/reducers/panels";
import type { SaveConfigsPayload } from "webviz-core/src/types/panels";
import { getPanelIdForType, getSaveConfigsPayloadForTab } from "webviz-core/src/util";

type OwnProps = {|
  defaultIsOpen?: boolean, // just for testing
|};

type Props = {|
  ...OwnProps,
  panels: PanelsState,
  changePanelLayout: (payload: any) => void,
  savePanelConfigs: (SaveConfigsPayload) => void,
|};

type State = {| isOpen: boolean |};

class UnconnectedAppMenu extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { isOpen: props.defaultIsOpen || false };
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return nextState.isOpen !== this.state.isOpen;
  }

  _onToggle = () => {
    const { isOpen } = this.state;
    this.setState({ isOpen: !isOpen });
  };

  _onPanelSelect = ({ type, config, relatedConfigs }: PanelSelection) => {
    const id = getPanelIdForType(type);
    let newPanels = { direction: "row", first: id, second: this.props.panels.layout };
    if (isEmpty(this.props.panels.layout)) {
      newPanels = id;
    }
    if (config && relatedConfigs) {
      const payload = getSaveConfigsPayloadForTab({ id, config, relatedConfigs });
      this.props.savePanelConfigs(payload);
    } else if (config) {
      this.props.savePanelConfigs({ configs: [{ id, config }] });
    }
    this.props.changePanelLayout({ layout: newPanels });
    window.ga("send", "event", "Panel", "Select", type);
  };

  render() {
    const { isOpen } = this.state;
    return (
      <ChildToggle position="below" onToggle={this._onToggle} isOpen={isOpen}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Icon small fade active={isOpen} tooltip="Add Panel">
            <PlusBoxIcon />
          </Icon>
        </div>
        <Menu>
          <PanelList onPanelSelect={this._onPanelSelect} />
        </Menu>
      </ChildToggle>
    );
  }
}

export default connect<Props, OwnProps, _, _, _, _>(
  (state: ReduxState) => ({
    panels: state.panels,
  }),
  { changePanelLayout, savePanelConfigs }
)(UnconnectedAppMenu);
