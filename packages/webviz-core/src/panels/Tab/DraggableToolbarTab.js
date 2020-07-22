// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useDispatch } from "react-redux";

import { moveTab, type MoveTabPayload } from "webviz-core/src/actions/panels";
import { type DraggingTabItem, TAB_DRAG_TYPE, type TabActions } from "webviz-core/src/panels/Tab/TabDndContext";
import { ToolbarTab } from "webviz-core/src/panels/Tab/ToolbarTab";

type Props = {|
  isActive: boolean,
  panelId: string,
  actions: TabActions,
  tabCount: number,
  tabIndex: number,
  tabTitle: string,
  setDraggingTabState: ({ isOver: boolean, item: ?DraggingTabItem }) => void,
|};

export function DraggableToolbarTab(props: Props) {
  const { isActive, tabCount, actions, panelId, tabTitle, tabIndex } = props;

  const ref = useRef(null);
  const dispatch = useDispatch();
  const [{ isDragging }, dragRef] = useDrag({
    item: { type: TAB_DRAG_TYPE, panelId, tabIndex },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, dropRef] = useDrop({
    accept: TAB_DRAG_TYPE,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    drop: (sourceItem, _monitor) => {
      const source = { panelId: sourceItem.panelId, tabIndex: sourceItem.tabIndex };
      const target = { tabIndex, panelId };
      dispatch(moveTab(({ source, target }: MoveTabPayload)));
    },
  });

  dragRef(dropRef(ref)); // Combine drag and drop refs

  const tabProps = {
    tabTitle,
    tabIndex,
    isActive,
    tabCount,
    actions,
    isDragging,
    innerRef: ref,
    hidden: isDragging,
    highlight: isOver,
  };
  return <ToolbarTab {...tabProps} />;
}
