// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as Sentry from "@sentry/browser";
import { flatMap, isEmpty } from "lodash";
import {
  createRemoveUpdate,
  getLeaves,
  getNodeAtPath,
  getPathFromNode,
  updateTree,
  MosaicWithoutDragDropContext,
} from "react-mosaic-component";

import type { TabPanelConfig } from "webviz-core/src/types/layouts";
import type {
  PanelConfig,
  ChangePanelLayoutPayload,
  SaveConfigsPayload,
  MosaicNode,
  MosaicPath,
  MosaicDropTargetPosition,
  SavedProps,
} from "webviz-core/src/types/panels";
import { TAB_PANEL_TYPE } from "webviz-core/src/util/globalConstants";

// given a panel type, create a unique id for a panel
// with the type embedded within the id
// we need this because react-mosaic
export function getPanelIdForType(type: string): string {
  const factor = 1e10;
  const rnd = Math.round(Math.random() * factor).toString(36);
  // a panel id consists of its type, an exclimation mark for splitting, and a random val
  // because each panel id functions is the react 'key' for the react-mosiac-component layout
  // but also must encode the panel type for panel factory construction
  return `${type}!${rnd}`;
}

// given a panel id, extract the encoded panel type
export function getPanelTypeFromId(id: string): string {
  return id.split("!")[0];
}

// given a panel id, return a panel id with the type changed
export function getPanelIdWithNewType(id: string, newPanelType: string): string {
  return id.replace(getPanelTypeFromId(id), newPanelType);
}

type PanelIdMap = { [panelId: string]: string };
type Configs = { [panelId: string]: PanelConfig };
function mapTemplateIdsToNewIds(templateIds: string[]): PanelIdMap {
  const result = {};
  for (const id of templateIds) {
    result[id] = getPanelIdForType(getPanelTypeFromId(id));
  }
  return result;
}

function getLayoutWithNewPanelIds(layout: MosaicNode, panelIdMap: PanelIdMap): ?MosaicNode {
  if (typeof layout === "string") {
    return getPanelIdForType(getPanelTypeFromId(layout));
  }

  if (!layout) {
    return null;
  }
  const newLayout = {};
  for (const key in layout) {
    if (typeof layout[key] === "object" && !Array.isArray(layout[key])) {
      newLayout[key] = getLayoutWithNewPanelIds(layout[key], panelIdMap);
    } else if (typeof layout[key] === "string" && panelIdMap[layout[key]]) {
      newLayout[key] = panelIdMap[layout[key]];
    } else {
      newLayout[key] = layout[key];
    }
  }
  // TODO: Refactor above to allow for better typing here.
  return ((newLayout: any): MosaicNode);
}

export const getSaveConfigsPayloadForNewTab = ({
  id,
  config,
  relatedConfigs,
}: {
  id: string,
  config: PanelConfig,
  relatedConfigs: Configs,
}): SaveConfigsPayload => {
  const templateIds = Object.keys(relatedConfigs);
  const panelIdMap = mapTemplateIdsToNewIds(templateIds);
  let newConfigs = templateIds.map((tempId) => ({ id: panelIdMap[tempId], config: relatedConfigs[tempId] }));
  if (config.tabs) {
    const newTabs = config.tabs.map((t) => ({ ...t, layout: getLayoutWithNewPanelIds(t.layout, panelIdMap) }));
    newConfigs = newConfigs.concat([{ id, config: { ...config, tabs: newTabs } }]);
  }
  return { configs: newConfigs };
};

export function getPanelIdsInsideTabPanels(panelIds: string[], savedProps: Configs): string[] {
  const tabPanelIds = panelIds.filter((id) => getPanelTypeFromId(id) === TAB_PANEL_TYPE);
  const tabLayouts = [];
  tabPanelIds.forEach((panelId) => {
    if (savedProps[panelId]?.tabs) {
      savedProps[panelId].tabs.forEach((tab) => {
        tabLayouts.push(tab.layout, ...getPanelIdsInsideTabPanels(getLeaves(tab.layout), savedProps));
      });
    }
  });
  return flatMap(tabLayouts, getLeaves);
}

export const DEFAULT_TAB_PANEL_CONFIG = { activeTabIdx: 0, tabs: [{ title: "1", layout: null }] };

export const validateTabPanelConfig = (config: ?PanelConfig) => {
  if (!Array.isArray(config?.tabs) || typeof config?.activeTabIdx !== "number") {
    const error = new Error("A non-Tab panel config is being operated on as if it were a Tab panel.");
    console.log("Invalid Tab panel config:", config, error);
    Sentry.captureException(error);
    return false;
  }
  if (config && config.activeTabIdx >= config.tabs.length) {
    const error = new Error("A Tab panel has an activeTabIdx for a nonexistent tab.");
    console.log("Invalid Tab panel config:", config, error);
    Sentry.captureException(error);
    return false;
  }
  return true;
};

export const updateTabPanelLayout = (layout: ?MosaicNode, tabPanelConfig: TabPanelConfig): TabPanelConfig => {
  return {
    ...tabPanelConfig,
    tabs: tabPanelConfig.tabs.map((tab, i) => {
      if (i === tabPanelConfig.activeTabIdx) {
        return { ...tab, layout };
      }
      return tab;
    }),
  };
};

export const removePanelFromTabPanel = (
  path: MosaicPath = [],
  config: TabPanelConfig,
  tabId: string
): SaveConfigsPayload => {
  if (!validateTabPanelConfig(config)) {
    return { configs: [] };
  }

  const currentTabLayout = config.tabs[config.activeTabIdx].layout;
  let newTree: ?MosaicNode;
  if (!path.length) {
    newTree = null;
  } else {
    const update = createRemoveUpdate(currentTabLayout, path);
    newTree = updateTree(currentTabLayout, [update]);
  }

  const saveConfigsPayload = { configs: [{ id: tabId, config: updateTabPanelLayout(newTree, config) }] };
  return saveConfigsPayload;
};

export const getTreeFromMovePanel = (
  panelId: string,
  newPath: MosaicPath,
  position: MosaicDropTargetPosition,
  tree: MosaicNode
): MosaicNode => {
  const node = getNodeAtPath(tree, newPath);
  const before = position === "left" || position === "top";
  const [first, second] = before ? [panelId, node] : [node, panelId];
  const direction = position === "left" || position === "right" ? "row" : "column";
  const updates = [{ path: newPath, spec: { $set: { first, second, direction } } }];
  const newTree = updateTree(tree, updates);

  return newTree;
};

export const addPanelToTab = (
  insertedPanelId: string,
  destinationPath: ?MosaicPath,
  destinationPosition: ?MosaicDropTargetPosition,
  tabConfig: ?PanelConfig,
  tabId: string
): SaveConfigsPayload => {
  const safeTabConfig =
    typeof tabConfig?.activeTabIdx === "number" && tabConfig?.tabs
      ? ((tabConfig: any): TabPanelConfig)
      : DEFAULT_TAB_PANEL_CONFIG;

  const currentTabLayout = safeTabConfig.tabs[safeTabConfig.activeTabIdx].layout;
  const newTree =
    currentTabLayout && destinationPath && destinationPosition
      ? getTreeFromMovePanel(insertedPanelId, destinationPath, destinationPosition, currentTabLayout)
      : insertedPanelId;

  const saveConfigsPayload = {
    configs: [
      {
        id: tabId,
        config: updateTabPanelLayout(newTree, safeTabConfig),
      },
    ],
  };
  return saveConfigsPayload;
};

export const replacePanelsWithNewPanel = (
  panelIdToReplace: ?string,
  replacementPanelId: ?string,
  panelIdsToRemove: string[],
  layout: MosaicNode
): ?MosaicNode => {
  if (getLeaves(layout).length === panelIdsToRemove.length) {
    return replacementPanelId;
  }
  const newTree = panelIdsToRemove.reduce((currentLayout, panelId) => {
    const pathToNode = getPathFromNode(panelId, currentLayout);
    const update =
      panelId === panelIdToReplace
        ? { path: pathToNode, spec: { $set: replacementPanelId } }
        : createRemoveUpdate(currentLayout, pathToNode);
    return updateTree(currentLayout, [update]);
  }, layout);
  return newTree;
};

export const groupPanelsOutput = (
  panelIdToReplace: ?string,
  layout: MosaicNode,
  panelIdsToGroup: string[]
): {
  tabPanelId: string,
  changePanelPayload: ChangePanelLayoutPayload,
  saveConfigsPayload: SaveConfigsPayload,
} => {
  const tabPanelId = getPanelIdForType(TAB_PANEL_TYPE);
  const newLayout = replacePanelsWithNewPanel(panelIdToReplace, tabPanelId, panelIdsToGroup, layout);
  const panelIdsToRemove = getLeaves(layout).filter((leaf) => !panelIdsToGroup.includes(leaf));
  const tabLayout = replacePanelsWithNewPanel(null, null, panelIdsToRemove, layout);

  return {
    tabPanelId,
    changePanelPayload: { layout: newLayout || "", trimSavedProps: false },
    saveConfigsPayload: {
      configs: [{ id: tabPanelId, config: { ...DEFAULT_TAB_PANEL_CONFIG, tabs: [{ title: "1", layout: tabLayout }] } }],
    },
  };
};

export const createTabsOutput = (
  panelIdToReplace: ?string,
  layout: MosaicNode,
  panelIdsForTabs: string[]
): {
  tabPanelId: string,
  changePanelPayload: ChangePanelLayoutPayload,
  saveConfigsPayload: SaveConfigsPayload,
} => {
  const tabPanelId = getPanelIdForType(TAB_PANEL_TYPE);
  const newLayout = replacePanelsWithNewPanel(panelIdToReplace, tabPanelId, panelIdsForTabs, layout);
  const tabs = panelIdsForTabs.map((panelId) => ({ title: getPanelTypeFromId(panelId), layout: panelId }));

  return {
    tabPanelId,
    changePanelPayload: { layout: newLayout || "", trimSavedProps: false },
    saveConfigsPayload: { configs: [{ id: tabPanelId, config: { ...DEFAULT_TAB_PANEL_CONFIG, tabs } }] },
  };
};

export const selectPanelOutput = (
  type: string,
  layout: ?MosaicNode,
  { config, relatedConfigs }: { config?: PanelConfig, relatedConfigs?: { [panelId: string]: PanelConfig } }
): { saveConfigsPayload: SaveConfigsPayload, changePanelPayload: ChangePanelLayoutPayload } => {
  const id = getPanelIdForType(type);
  let saveConfigsPayload = { configs: [] };
  if (config) {
    saveConfigsPayload = relatedConfigs
      ? getSaveConfigsPayloadForNewTab({ id, config, relatedConfigs })
      : { configs: [{ id, config }] };
  }
  const changePanelPayload = {
    layout: isEmpty(layout) ? id : { direction: "row", first: id, second: layout },
    trimSavedProps: !relatedConfigs,
  };

  return { saveConfigsPayload, changePanelPayload };
};

export const onNewPanelDrop = ({
  layout,
  newPanelType,
  destinationPath = [],
  position,
  savedProps,
  tabId,
  config,
  relatedConfigs,
}: {
  layout: MosaicNode,
  newPanelType: string,
  destinationPath?: MosaicPath,
  position: MosaicWithoutDragDropContext,
  savedProps: SavedProps,
  tabId: ?string,
  config: ?PanelConfig,
  relatedConfigs: ?{ [panelId: string]: PanelConfig },
}): { saveConfigsPayload: SaveConfigsPayload, layout: MosaicNode } => {
  const id = getPanelIdForType(newPanelType);
  let newLayout = layout;

  const configs = [];
  // This means we've dragged into a Tab panel.
  if (tabId) {
    const { configs: newConfigs } = addPanelToTab(id, destinationPath, position, savedProps[tabId], tabId);
    configs.push(...newConfigs);
  } else {
    newLayout = getTreeFromMovePanel(id, destinationPath, position, layout);
  }

  // 'relatedConfigs' are used in Tab panel presets, so that the panels'
  // respective configs will be saved globally.
  if (config && relatedConfigs) {
    const { configs: newConfigs } = getSaveConfigsPayloadForNewTab({ id, config, relatedConfigs });
    configs.push(...newConfigs);
  } else if (config) {
    configs.push({ id, config });
  }

  return { saveConfigsPayload: { configs }, layout: newLayout };
};
