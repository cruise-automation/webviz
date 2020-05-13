// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import _ from "lodash";
import React, { useContext, type Node } from "react";
import { useDrag } from "react-dnd";
import {
  MosaicDragType,
  createDragToUpdates,
  MosaicContext,
  MosaicWindowContext,
  getNodeAtPath,
  updateTree,
  createRemoveUpdate,
} from "react-mosaic-component";
import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { savePanelConfigs, changePanelLayout } from "webviz-core/src/actions/panels";
import { usePanelContext } from "webviz-core/src/components/PanelContext";
import type {
  SaveConfigsPayload,
  MosaicNode,
  MosaicPath,
  MosaicDropTargetPosition,
  SavedProps,
} from "webviz-core/src/types/panels";
import {
  removePanelFromTabPanel,
  getTreeFromMovePanel,
  addPanelToTab,
  updateTabPanelLayout,
} from "webviz-core/src/util/layout";

// Exported for tests.
export const dragHandler = ({
  mainLayout,
  panelId,
  savedProps,
  sourceTabId,
  targetTabId,
  position,
  destinationPath,
  ownPath,
}: {
  mainLayout: MosaicNode,
  panelId: string,
  savedProps: SavedProps,
  sourceTabId: ?string,
  targetTabId: ?string,
  position: ?MosaicDropTargetPosition,
  destinationPath: ?MosaicPath,
  ownPath: MosaicPath,
}): { panelConfigs: SaveConfigsPayload, layout: MosaicNode } => {
  const toMainFromTab = sourceTabId && !targetTabId;
  const toTabfromMain = !sourceTabId && targetTabId;
  const toTabfromTab = sourceTabId && targetTabId;
  const withinSameTab = sourceTabId === targetTabId && toTabfromTab; // In case it's simply a drag within the main layout.
  const sourceTabConfig = sourceTabId ? savedProps[sourceTabId] : null;
  const targetTabConfig = targetTabId ? savedProps[targetTabId] : null;

  if (withinSameTab && sourceTabConfig && sourceTabId) {
    const currentTabLayout = sourceTabConfig.tabs[sourceTabConfig.activeTabIdx].layout;
    if (typeof currentTabLayout === "string") {
      return {
        layout: mainLayout,
        panelConfigs: {
          configs: [
            {
              id: sourceTabId,
              // Here we assume that the `begin` handler already removed the tab from the config. Here it is simply
              // replacing it, or keeping it as is.
              config: updateTabPanelLayout(currentTabLayout, sourceTabConfig),
            },
          ],
        },
      };
    }

    const updates = createDragToUpdates(currentTabLayout, ownPath, destinationPath, position);
    const newTree = updateTree(currentTabLayout, updates);
    return {
      panelConfigs: { configs: [{ id: sourceTabId, config: updateTabPanelLayout(newTree, savedProps[sourceTabId]) }] },
      layout: mainLayout,
    };
  }

  if (toMainFromTab && sourceTabConfig && sourceTabId && destinationPath && position) {
    const currentTabLayout = sourceTabConfig.tabs[sourceTabConfig.activeTabIdx].layout;
    // Remove panel from tab layout
    const saveConfigsPayload = removePanelFromTabPanel(ownPath, savedProps[sourceTabId], sourceTabId);

    // Insert it into main layout
    const currentNode = getNodeAtPath(currentTabLayout, ownPath);
    const newLayout = getTreeFromMovePanel(currentNode, destinationPath, position, mainLayout);

    return { panelConfigs: saveConfigsPayload, layout: newLayout };
  }

  if (toTabfromMain && targetTabId) {
    const saveConfigsPayload = addPanelToTab(panelId, destinationPath, position, targetTabConfig, targetTabId);
    const update = createRemoveUpdate(mainLayout, ownPath);
    const newLayout = updateTree(mainLayout, [update]);
    return { panelConfigs: saveConfigsPayload, layout: newLayout };
  }

  if (toTabfromTab && sourceTabId && sourceTabConfig && targetTabId) {
    // Remove panel from tab layout
    const { configs: fromTabConfigs } = removePanelFromTabPanel(ownPath, sourceTabConfig, sourceTabId);

    // Insert it into another tab.
    const { configs: toTabConfigs } = addPanelToTab(panelId, destinationPath, position, targetTabConfig, targetTabId);
    return { panelConfigs: { configs: [...fromTabConfigs, ...toTabConfigs] }, layout: mainLayout };
  }

  if (typeof mainLayout === "string") {
    return {
      layout: mainLayout,
      panelConfigs: { configs: [] },
    };
  }

  if (position != null && destinationPath != null && !_.isEqual(destinationPath, ownPath)) {
    const updates = createDragToUpdates(mainLayout, ownPath, destinationPath, position);
    const newLayout = updateTree(mainLayout, updates);
    return { panelConfigs: { configs: [] }, layout: newLayout };
  }
  const newLayout = updateTree(mainLayout, [{ path: _.dropRight(ownPath), spec: { splitPercentage: { $set: null } } }]);
  return { panelConfigs: { configs: [] }, layout: newLayout };
};

// HOC to integrate mosaic drag functionality into any other component
function MosaicDragHandle(props: { children: Node, tabId?: string, onDragStart?: () => void, onDragEnd?: () => void }) {
  const { children, tabId: sourceTabId, onDragStart, onDragEnd } = props;
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const { id } = usePanelContext();

  const dispatch = useDispatch();
  const mosaicId = useSelector(({ mosaic }) => mosaic.mosaicId);
  const mainLayout = useSelector(({ panels }) => panels.layout);
  const savedProps = useSelector(({ panels }) => panels.savedProps);
  const actions = React.useMemo(() => bindActionCreators({ savePanelConfigs, changePanelLayout }, dispatch), [
    dispatch,
  ]);

  const [__, drag] = useDrag({
    item: { type: MosaicDragType.WINDOW },
    begin: (monitor) => {
      if (onDragStart) {
        onDragStart();
      }

      // The defer is necessary as the element must be present on start for HTML DnD to not cry
      const path = mosaicWindowActions.getPath();
      const deferredHide = _.defer(() => {
        if (path.length) {
          mosaicActions.hide(path);
        } else if (sourceTabId) {
          // If we've dragged a panel from a single panel tab layout.
          const sourceTabConfig = savedProps[sourceTabId];
          actions.savePanelConfigs({
            configs: [
              {
                id: sourceTabId,
                config: updateTabPanelLayout(null, sourceTabConfig),
              },
            ],
          });
        }
      });
      return { mosaicId, deferredHide };
    },
    end: (item, monitor) => {
      if (onDragEnd) {
        onDragEnd();
      }

      // If the hide call hasn't happened yet, cancel it
      window.clearTimeout(item.deferredHide);
      const ownPath = mosaicWindowActions.getPath();
      const dropResult = monitor.getDropResult() || {};
      const { position, path: destinationPath, tabId: targetTabId } = dropResult;

      const { layout, panelConfigs } = dragHandler({
        mainLayout,
        panelId: id,
        savedProps,
        sourceTabId,
        targetTabId,
        position,
        destinationPath,
        ownPath,
      });
      // NOTE: Order matters here - must change layout first,
      // so that savePanelConfigs won't trim configs for panels not present in the layout
      actions.changePanelLayout({ layout, trimSavedProps: false });
      actions.savePanelConfigs(panelConfigs);
    },
  });
  return <div ref={drag}>{children}</div>;
}

export default MosaicDragHandle;
