// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useCallback, useMemo, useState } from "react";
import { hot } from "react-hot-loader/root";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";

import { savePanelConfigs } from "webviz-core/src/actions/panels";
import Flex from "webviz-core/src/components/Flex";
import Panel from "webviz-core/src/components/Panel";
import { usePanelContext } from "webviz-core/src/components/PanelContext";
import { UnconnectedPanelLayout } from "webviz-core/src/components/PanelLayout";
import { EmptyDropTarget } from "webviz-core/src/panels/Tab/EmptyDropTarget";
import { TabbedToolbar } from "webviz-core/src/panels/Tab/TabbedToolbar";
import { type DraggingTabPanelState, TabDndContext } from "webviz-core/src/panels/Tab/TabDndContext";
import type { TabPanelConfig as Config } from "webviz-core/src/types/layouts";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { TAB_PANEL_TYPE } from "webviz-core/src/util/globalConstants";
import { DEFAULT_TAB_PANEL_CONFIG, updateTabPanelLayout } from "webviz-core/src/util/layout";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SPanelCover = styled.div`
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: ${colors.DARK};
  position: absolute;
`;

type Props = { config: Config, saveConfig: SaveConfig<Config> };

function Tab({ config, saveConfig }: Props) {
  const panelId = usePanelContext()?.id;
  const dispatch = useDispatch();
  const mosaicId = useSelector(({ mosaic }) => mosaic.mosaicId);
  const savePanelConfigsFn = useCallback(dispatch(savePanelConfigs), [dispatch]);

  const { tabs, activeTabIdx } = config;
  const activeTab = tabs[activeTabIdx];
  const activeLayout = activeTab?.layout;

  // Holds the state of actively dragging tabs as they relate to this Tab Panel
  const [draggingTabState, setDraggingTabState] = useState<DraggingTabPanelState>({
    item: null,
    isOver: false,
  });

  // Create the actions used by the tab
  const selectTab = useCallback((idx) => {
    saveConfig({ activeTabIdx: idx });
  }, [saveConfig]);
  const setTabTitle = useCallback((idx, title) => {
    const newTabs = tabs.slice();
    newTabs[idx] = { ...tabs[idx], title };
    saveConfig({ tabs: newTabs });
  }, [saveConfig, tabs]);
  const removeTab = useCallback((idx) => {
    const newTabs = tabs.slice(0, idx).concat(tabs.slice(idx + 1));
    const lastIdx = tabs.length - 1;
    saveConfig({ tabs: newTabs, activeTabIdx: activeTabIdx === lastIdx ? lastIdx - 1 : activeTabIdx });
  }, [activeTabIdx, saveConfig, tabs]);
  const addTab = useCallback(() => {
    const newTab = { title: `${tabs.length + 1}`, layout: null };
    saveConfig({ ...config, activeTabIdx: tabs.length, tabs: tabs.concat([newTab]) });
  }, [config, saveConfig, tabs]);
  const onChangeLayout = useCallback((layout: string) => {
    saveConfig(updateTabPanelLayout(layout, config));
  }, [config, saveConfig]);
  const actions = useMemo(() => ({ addTab, removeTab, selectTab, setTabTitle }), [
    addTab,
    removeTab,
    selectTab,
    setTabTitle,
  ]);

  // If the user drags the active tab out of the toolbar, we'll hide the
  // active layout in order to prevent tabs from dropping into child tabs.
  const draggingTab = draggingTabState.item;
  const preventTabDrop =
    !!draggingTab &&
    draggingTab.panelId === panelId &&
    draggingTab.tabIndex === activeTabIdx &&
    !draggingTabState.isOver;

  return (
    <Flex col>
      <TabbedToolbar
        panelId={panelId}
        tabs={tabs}
        actions={actions}
        activeTabIdx={activeTabIdx}
        setDraggingTabState={setDraggingTabState}
      />
      <Flex
        style={{
          position: "relative",
        }}>
        {activeLayout ? (
          <TabDndContext.Provider value={{ preventTabDrop }}>
            <UnconnectedPanelLayout
              importHooks={false}
              layout={activeLayout}
              savePanelConfigs={savePanelConfigsFn}
              onChange={onChangeLayout}
              setMosaicId={() => {}}
              mosaicId={mosaicId}
              tabId={panelId}
              removeRootDropTarget
            />
          </TabDndContext.Provider>
        ) : (
          <EmptyDropTarget mosaicId={mosaicId} tabId={panelId} />
        )}
        {preventTabDrop && <SPanelCover />}
      </Flex>
    </Flex>
  );
}

Tab.panelType = TAB_PANEL_TYPE;
Tab.defaultConfig = DEFAULT_TAB_PANEL_CONFIG;

export default hot(Panel<Config>(Tab));
