// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { createContext } from "react";

export const TAB_DRAG_TYPE = "TAB";
export type DraggingTabItem = { type: typeof TAB_DRAG_TYPE, tabIndex: number, panelId: string };
export type DraggingTabPanelState = {
  item: ?DraggingTabItem,
  isOver: boolean,
};

export type TabActions = {|
  addTab: () => void,
  removeTab: (tabIndex: number) => void,
  selectTab: (tabIndex: number) => void,
  setTabTitle: (tabIndex: number, title: string) => void,
|};

// It allows nested TabPanels to know if their parent tab is being dragged.
// This allows us to prevent situations where the parent tab is dragged into a child tab.
export const TabDndContext = createContext<{
  preventTabDrop: boolean,
}>({ preventTabDrop: false });
