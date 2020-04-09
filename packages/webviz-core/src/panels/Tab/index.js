// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CloseIcon from "@mdi/svg/svg/close.svg";
import PlusIcon from "@mdi/svg/svg/plus.svg";
import React, { useCallback } from "react";
import { hot } from "react-hot-loader/root";
import { useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import styled from "styled-components";
import textWidth from "text-width";

import helpContent from "./index.help.md";
import { savePanelConfigs } from "webviz-core/src/actions/panels";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Panel from "webviz-core/src/components/Panel";
import { UnconnectedPanelLayout } from "webviz-core/src/components/PanelLayout";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import Tooltip from "webviz-core/src/components/Tooltip";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { TAB_PANEL_TYPE } from "webviz-core/src/util/globalConstants";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const FONT_SIZE = 12;
const FONT_FAMILY = "'Inter UI', -apple-system, BlinkMacSystemFont, sans-serif";
const MAX_TAB_WIDTH = 100;
const MIN_ACTIVE_TAB_WIDTH = 40;
const MIN_OTHER_TAB_WIDTH = 14;
function measureText(text: string): number {
  return textWidth(text, { family: FONT_FAMILY, size: FONT_SIZE }) + 3;
}

const STab = styled.div`
  display: flex;
  background-color: ${({ isActive }) => (isActive ? colors.DARK4 : "")};
  width: 100%;
  min-width: ${({ isActive, value, numTabs }) =>
    isActive
      ? `calc(max(${MIN_ACTIVE_TAB_WIDTH}px,  min(${Math.ceil(
          measureText(value) + 30
        )}px, ${MAX_TAB_WIDTH}px, 100% - ${MIN_OTHER_TAB_WIDTH * (numTabs - 1)}px)))`
      : undefined};
  max-width: ${MAX_TAB_WIDTH}px;
  padding: 1px;
  height: 20px;
  border-right: 1px solid ${colors.DARK4};
`;
const SInput = styled.input`
  width: ${(props) => (props.isActive ? "calc(100% - 20px)" : "100%")};
  cursor: pointer;
`;
const clearBgStyle = { backgroundColor: "transparent", padding: 0 };

type Config = { activeTabIdx: number, tabs: { title: string, layout: any }[] };
type Props = { config: Config, saveConfig: SaveConfig<Config> };
function Tab({ config, saveConfig }: Props) {
  const dispatch = useDispatch();
  const actions = React.useMemo(() => bindActionCreators({ savePanelConfigs }, dispatch), [dispatch]);
  const { tabs, activeTabIdx } = config;

  const selectTab = useCallback(
    (idx) => {
      saveConfig({ activeTabIdx: idx });
    },
    [saveConfig]
  );
  const editTab = useCallback(
    (idx, e) => {
      const newTabs = tabs.slice();
      newTabs[idx] = { ...tabs[idx], title: e.target.value };
      saveConfig({ tabs: newTabs });
    },
    [saveConfig, tabs]
  );
  const removeTab = useCallback(
    (idx) => {
      const newTabs = tabs.slice(0, idx).concat(tabs.slice(idx + 1));
      const lastIdx = tabs.length - 1;
      saveConfig({ tabs: newTabs, activeTabIdx: activeTabIdx === lastIdx ? lastIdx - 1 : activeTabIdx });
    },
    [activeTabIdx, saveConfig, tabs]
  );
  const addTab = useCallback(
    () => {
      const newTab = { title: `${tabs.length + 1}`, layout: {} };
      saveConfig({ ...config, activeTabIdx: tabs.length, tabs: tabs.concat([newTab]) });
    },
    [config, saveConfig, tabs]
  );

  const onChangeLayout = useCallback(
    (layout) => {
      const newTabs = tabs.slice();
      newTabs[activeTabIdx] = { ...tabs[activeTabIdx], layout };
      saveConfig({ tabs: newTabs });
    },
    [activeTabIdx, saveConfig, tabs]
  );

  return (
    <Flex col style={{ paddingTop: 0, position: "relative" }}>
      <PanelToolbar helpContent={helpContent} showHiddenControlsOnHover>
        <Flex>
          {tabs.map((tab, idx) => {
            const isActive = activeTabIdx === idx;
            return (
              <STab
                key={idx}
                isActive={isActive}
                numTabs={tabs.length}
                value={tab.title || ""}
                onClick={selectTab.bind(null, idx)}>
                <Tooltip contents={tab.title || "Enter tab name"} placement="top">
                  <SInput
                    isActive={isActive}
                    disabled={!isActive}
                    placeholder="Enter tab name"
                    style={clearBgStyle}
                    value={tab.title || ""}
                    onChange={editTab.bind(null, idx)}
                  />
                </Tooltip>
                {isActive ? (
                  <Icon
                    small
                    fade
                    dataTest="remove-tab"
                    tooltip="Remove tab"
                    style={{ width: "22px" }}
                    onClick={removeTab.bind(null, idx)}>
                    <CloseIcon onMouseDown={(e) => e.preventDefault()} />
                  </Icon>
                ) : null}
              </STab>
            );
          })}
          <Icon small fade dataTest="add-tab" tooltip="Add tab" style={{ flexShrink: 0 }} onClick={addTab}>
            <PlusIcon onMouseDown={(e) => e.preventDefault()} />
          </Icon>
        </Flex>
      </PanelToolbar>
      <UnconnectedPanelLayout
        importHooks={false}
        layout={tabs[activeTabIdx]?.layout || {}}
        savePanelConfigs={actions.savePanelConfigs}
        onChange={onChangeLayout}
        setMosaicId={() => {}}
      />
    </Flex>
  );
}
Tab.panelType = TAB_PANEL_TYPE;
Tab.defaultConfig = { activeTabIdx: 0, tabs: [] };

export default hot(Panel<Config>(Tab));
