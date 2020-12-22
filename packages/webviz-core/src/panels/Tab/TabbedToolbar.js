// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PlusIcon from "@mdi/svg/svg/plus.svg";
import React, { useContext, useEffect } from "react";
import { type DropTargetMonitor, useDrop } from "react-dnd";
import { useDispatch } from "react-redux";
import styled from "styled-components";

import { moveTab, type MoveTabPayload } from "webviz-core/src/actions/panels";
import Icon from "webviz-core/src/components/Icon";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { DraggableToolbarTab } from "webviz-core/src/panels/Tab/DraggableToolbarTab";
import helpContent from "webviz-core/src/panels/Tab/index.help.md";
import {
  type DraggingTabItem,
  TAB_DRAG_TYPE,
  type TabActions,
  TabDndContext,
} from "webviz-core/src/panels/Tab/TabDndContext";
import type { TabConfig } from "webviz-core/src/types/layouts";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const STabbedToolbar = styled.div`
  flex: 0 0;
  display: flex;
  position: relative;
  flex-direction: column;

  &:after {
    border: 2px solid ${({ highlight }) => (highlight ? colors.DARK5 : "transparent")};
    content: "";
    height: 100%;
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 1;
  }
`;
const STabs = styled.div`
  flex: 1 1;
  display: flex;
  align-items: flex-end;
`;

type Props = {|
  panelId: string,
  actions: TabActions,
  tabs: TabConfig[],
  activeTabIdx: number,
  setDraggingTabState: ({ isOver: boolean, item: ?DraggingTabItem }) => void,
|};

export function TabbedToolbar(props: Props) {
  const { panelId, actions, tabs, activeTabIdx, setDraggingTabState } = props;

  const dispatch = useDispatch();
  const { preventTabDrop } = useContext(TabDndContext);
  const [{ isOver, item }, dropRef] = useDrop({
    accept: TAB_DRAG_TYPE,
    collect: (monitor) => ({
      item: monitor.getItem(),
      isOver: monitor.isOver(),
    }),
    canDrop: () => !preventTabDrop,
    drop: (sourceItem: DraggingTabItem, monitor: DropTargetMonitor) => {
      // Drop was already handled by DraggableToolTab, ignore here
      if (monitor.didDrop()) {
        return;
      }
      const source = {
        panelId: sourceItem.panelId,
        tabIndex: sourceItem.tabIndex,
      };
      const target = { panelId };
      dispatch(moveTab(({ source, target }: MoveTabPayload)));
    },
  });
  useEffect(() => {
    setDraggingTabState({ item, isOver });
  }, [item, isOver, setDraggingTabState]);

  return (
    <STabbedToolbar highlight={isOver}>
      <PanelToolbar helpContent={helpContent} showHiddenControlsOnHover>
        <STabs ref={dropRef} data-test="toolbar-droppable">
          {tabs.map((tab, i) => (
            <DraggableToolbarTab
              isActive={activeTabIdx === i}
              key={i}
              panelId={panelId}
              setDraggingTabState={setDraggingTabState}
              actions={actions}
              tabCount={tabs.length}
              tabIndex={i}
              tabTitle={tab.title}
            />
          ))}
          <Icon
            small
            fade
            dataTest="add-tab"
            tooltip="Add tab"
            style={{
              flexShrink: 0,
              margin: "0 8px",
              transition: "opacity 0.2s",
            }}
            onClick={actions.addTab}>
            <PlusIcon onMouseDown={(e) => e.preventDefault()} />
          </Icon>
        </STabs>
      </PanelToolbar>
    </STabbedToolbar>
  );
}
