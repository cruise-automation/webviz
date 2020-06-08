// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PlusBoxIcon from "@mdi/svg/svg/plus-box.svg";
import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { changePanelLayout, savePanelConfigs } from "webviz-core/src/actions/panels";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import PanelList, { type PanelSelection } from "webviz-core/src/panels/PanelList";
import type { State as ReduxState } from "webviz-core/src/reducers";
import { selectPanelOutput } from "webviz-core/src/util/layout";

type Props = {|
  defaultIsOpen?: boolean, // just for testing
|};

function AppMenu(props: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(props.defaultIsOpen || false);
  const onToggle = useCallback(() => setIsOpen((open) => !open), []);

  const layout = useSelector((state: ReduxState) => state.panels.layout);
  const dispatch = useDispatch();

  const onPanelSelect = useCallback(
    ({ type, config, relatedConfigs }: PanelSelection) => {
      const { changePanelPayload, saveConfigsPayload } = selectPanelOutput(type, layout, {
        config,
        relatedConfigs,
      });
      dispatch(changePanelLayout(changePanelPayload));
      dispatch(savePanelConfigs(saveConfigsPayload));
      window.ga("send", "event", "Panel", "Select", type);
    },
    [dispatch, layout]
  );

  return (
    <ChildToggle position="below" onToggle={onToggle} isOpen={isOpen}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Icon small fade active={isOpen} tooltip="Add Panel">
          <PlusBoxIcon />
        </Icon>
      </div>
      <Menu>
        <PanelList onPanelSelect={onPanelSelect} />
      </Menu>
    </ChildToggle>
  );
}

export default AppMenu;
