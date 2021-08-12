// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as Sentry from "@sentry/browser";
import { compact, cloneDeep, flatMap, isEmpty, xor, uniq } from "lodash";
import {
  createRemoveUpdate,
  getLeaves,
  getNodeAtPath,
  getPathFromNode,
  updateTree,
  type MosaicUpdate,
} from "react-mosaic-component";

import { getLayoutNameAndVersion } from "webviz-core/shared/layout";
import { type PanelsState } from "webviz-core/src/reducers/panels";
import type { TabLocation, TabPanelConfig } from "webviz-core/src/types/layouts";
import type {
  ConfigsPayload,
  PanelConfig,
  SaveConfigsPayload,
  MosaicNode,
  MosaicPath,
  MosaicDropTargetPosition,
  SavedProps,
} from "webviz-core/src/types/panels";
import {
  TAB_PANEL_TYPE,
  LAYOUT_QUERY_KEY,
  TITLE_QUERY_KEY,
  LAYOUT_URL_QUERY_KEY,
} from "webviz-core/src/util/globalConstants";

export function getPanelIdForType(type: string): string {
  const factor = 1e10;
  const rnd = Math.round(Math.random() * factor).toString(36);
  // a panel id consists of its type, an exclamation mark for splitting, and a random val
  // because each panel id functions is the react 'key' for the react-mosaic-component layout
  // but also must encode the panel type for panel factory construction
  return `${type}!${rnd}`;
}

// DUPLICATED in webviz-core/migrations/ to be used for frozen migrations
export function getPanelTypeFromId(id: string): string {
  return id.split("!")[0];
}

// DUPLICATED in webviz-core/migrations/ to be used for frozen migrations
export function getPanelIdWithNewType(id: string, newPanelType: string): string {
  return id.replace(getPanelTypeFromId(id), newPanelType);
}

export function isTabPanel(panelId: string) {
  return getPanelTypeFromId(panelId) === TAB_PANEL_TYPE;
}

type PanelIdMap = { [panelId: string]: string };
function mapTemplateIdsToNewIds(templateIds: string[]): PanelIdMap {
  const result = {};
  for (const id of templateIds) {
    result[id] = getPanelIdForType(getPanelTypeFromId(id));
  }
  return result;
}

function getLayoutWithNewPanelIds(layout: MosaicNode, panelIdMap: PanelIdMap): ?MosaicNode {
  if (typeof layout === "string") {
    // return corresponding ID if it exists in panelIdMap
    // (e.g. for Tab panel presets with 1 panel in active layout)
    return panelIdMap[layout] || getPanelIdForType(getPanelTypeFromId(layout));
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

// Recursively removes all empty nodes from a layout
function compactLayout(layout: MosaicNode): MosaicNode {
  if (typeof layout === "string") {
    return layout;
  }

  const prunedChildren = [layout.first, layout.second].filter(Boolean).map(compactLayout);
  return prunedChildren.length < 2
    ? prunedChildren[0]
    : {
        ...layout,
        first: prunedChildren[0],
        second: prunedChildren[1],
      };
}

// Recursively replaces all leaves of the current layout
function replaceLeafLayouts(layout: MosaicNode, replacerFn: (layout: MosaicNode) => MosaicNode) {
  if (typeof layout === "string") {
    return replacerFn(layout);
  }
  return {
    ...layout,
    first: replaceLeafLayouts(layout.first, replacerFn),
    second: replaceLeafLayouts(layout.second, replacerFn),
  };
}

// Replaces Tab panels with their active tab's layout
export function inlineTabPanelLayouts(layout: MosaicNode, savedProps: SavedProps, preserveTabPanelIds: string[]) {
  const tabFreeLayout = replaceLeafLayouts(layout, (id) => {
    if (typeof id === "string" && isTabPanel(id) && !preserveTabPanelIds.includes(id)) {
      const panelProps = getValidTabPanelConfig(id, savedProps);
      const tabLayout = panelProps.tabs[panelProps.activeTabIdx]?.layout;
      if (tabLayout) {
        return inlineTabPanelLayouts(tabLayout, savedProps, preserveTabPanelIds);
      }
    }
    return id;
  });
  return compactLayout(tabFreeLayout);
}

// Maps panels to their parent Tab panel
export const getParentTabPanelByPanelId = (savedProps: SavedProps): { [string]: string } =>
  Object.entries(savedProps).reduce((memo, [savedPanelId, savedConfig]) => {
    if (isTabPanel(savedPanelId) && savedConfig) {
      const tabPanelConfig: TabPanelConfig = (savedConfig: any);
      tabPanelConfig.tabs.forEach((tab) => {
        const panelIdsInTab = getLeaves(tab.layout);
        panelIdsInTab.forEach((id) => (memo[id] = savedPanelId));
      });
    }
    return memo;
  }, {});

const replaceMaybeTabLayoutWithNewPanelIds = (panelIdMap) => ({ id, config }) => {
  return config.tabs
    ? {
        id,
        config: {
          ...config,
          tabs: config.tabs.map((t) => ({ ...t, layout: getLayoutWithNewPanelIds(t.layout, panelIdMap) })),
        },
      }
    : { id, config };
};

export const getSaveConfigsPayloadForAddedPanel = ({
  id,
  config,
  relatedConfigs,
}: {
  id: string,
  config: PanelConfig,
  relatedConfigs: ?SavedProps,
}): SaveConfigsPayload => {
  if (!relatedConfigs) {
    return { configs: [{ id, config }] };
  }
  const configIds = getPanelIdsInsideTabPanels([id], { [id]: config });
  // Make sure to add in the relatedConfigs ids here or else nested tab configs won't be set properly
  const templateIds = uniq([...Object.keys(relatedConfigs), ...configIds]);
  const panelIdMap = mapTemplateIdsToNewIds(templateIds);
  let newConfigs = templateIds.map((tempId) => ({ id: panelIdMap[tempId], config: relatedConfigs[tempId] }));
  newConfigs = [...newConfigs, { id, config }]
    .filter((configObj) => configObj.config)
    .map(replaceMaybeTabLayoutWithNewPanelIds(panelIdMap));
  return { configs: newConfigs };
};

export function getPanelIdsInsideTabPanels(panelIds: string[], savedProps: SavedProps): string[] {
  const tabPanelIds = panelIds.filter(isTabPanel);
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
// Returns all panelIds for a given layout (including layouts stored in Tab panels)
export function getAllPanelIds(layout: MosaicNode, savedProps: SavedProps): string[] {
  const layoutPanelIds = getLeaves(layout);
  const tabPanelIds = getPanelIdsInsideTabPanels(layoutPanelIds, savedProps);
  return [...layoutPanelIds, ...tabPanelIds];
}

export const validateTabPanelConfig = (config: ?PanelConfig) => {
  if (!config) {
    return false;
  }
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
  const updatedTabs = tabPanelConfig.tabs.map((tab, i) => {
    if (i === tabPanelConfig.activeTabIdx) {
      return { ...tab, layout };
    }
    return tab;
  });
  // Create a new tab if there isn't one active
  if (tabPanelConfig.activeTabIdx === -1) {
    updatedTabs.push({ layout, title: "1" });
  }
  return {
    ...tabPanelConfig,
    tabs: updatedTabs,
    activeTabIdx: Math.max(0, tabPanelConfig.activeTabIdx),
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

export const createAddUpdates = (
  tree: ?MosaicNode,
  panelId: string,
  newPath: MosaicPath,
  position: MosaicDropTargetPosition
): MosaicUpdate[] => {
  if (!tree) {
    return [];
  }
  const node = getNodeAtPath(tree, newPath);
  const before = position === "left" || position === "top";
  const [first, second] = before ? [panelId, node] : [node, panelId];
  const direction = position === "left" || position === "right" ? "row" : "column";
  const updates = [{ path: newPath, spec: { $set: { first, second, direction } } }];
  return updates;
};

export const addPanelToTab = (
  insertedPanelId: string,
  destinationPath: ?MosaicPath,
  destinationPosition: ?MosaicDropTargetPosition,
  tabConfig: ?PanelConfig,
  tabId: string
): SaveConfigsPayload => {
  const safeTabConfig = validateTabPanelConfig(tabConfig)
    ? ((tabConfig: any): TabPanelConfig)
    : DEFAULT_TAB_PANEL_CONFIG;

  const currentTabLayout = safeTabConfig.tabs[safeTabConfig.activeTabIdx]?.layout;
  const newTree =
    currentTabLayout && destinationPath && destinationPosition
      ? updateTree(
          currentTabLayout,
          createAddUpdates(currentTabLayout, insertedPanelId, destinationPath, destinationPosition)
        )
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

function getValidTabPanelConfig(panelId: string, savedProps: SavedProps): TabPanelConfig {
  const config = savedProps[panelId];
  return validateTabPanelConfig(config) ? config : DEFAULT_TAB_PANEL_CONFIG;
}

export const reorderTabWithinTabPanel = ({
  source,
  target,
  savedProps,
}: {
  source: TabLocation,
  target: TabLocation,
  savedProps: SavedProps,
}): SaveConfigsPayload => {
  const { tabs, activeTabIdx } = getValidTabPanelConfig(source.panelId, savedProps);

  const sourceIndex = source.tabIndex ?? tabs.length - 1; // source.tabIndex will always be set
  const targetIndex = target.tabIndex ?? tabs.length - 1; // target.tabIndex will only be set when dropping on a tab

  const nextSourceTabs = [...tabs.slice(0, sourceIndex), ...tabs.slice(sourceIndex + 1)];
  nextSourceTabs.splice(targetIndex, 0, tabs[sourceIndex]);

  // Update activeTabIdx so the active tab does not change when we move the tab
  const movedActiveTab = activeTabIdx === source.tabIndex;
  const movedToBeforeActiveTab = targetIndex <= activeTabIdx && sourceIndex >= activeTabIdx;
  const movedFromBeforeActiveTab = sourceIndex <= activeTabIdx && targetIndex >= activeTabIdx;

  let nextActiveTabIdx = activeTabIdx;
  if (movedActiveTab) {
    nextActiveTabIdx = targetIndex;
  } else if (movedToBeforeActiveTab) {
    nextActiveTabIdx++;
  } else if (movedFromBeforeActiveTab) {
    nextActiveTabIdx--;
  }

  return {
    configs: [{ id: source.panelId, config: { tabs: nextSourceTabs, activeTabIdx: nextActiveTabIdx } }],
  };
};

export const moveTabBetweenTabPanels = ({
  source,
  target,
  savedProps,
}: {
  source: TabLocation,
  target: TabLocation,
  savedProps: SavedProps,
}): SaveConfigsPayload => {
  const sourceConfig = getValidTabPanelConfig(source.panelId, savedProps);
  const targetConfig = getValidTabPanelConfig(target.panelId, savedProps);

  const sourceIndex = source.tabIndex ?? sourceConfig.tabs.length;
  const targetIndex = target.tabIndex ?? targetConfig.tabs.length;
  const nextTabsSource = [...sourceConfig.tabs.slice(0, sourceIndex), ...sourceConfig.tabs.slice(sourceIndex + 1)];

  const nextTabsTarget = targetConfig.tabs.slice();
  nextTabsTarget.splice(targetIndex, 0, sourceConfig.tabs[sourceIndex]);

  // Update activeTabIdx so the active tab does not change as we move the tab
  const movedToBeforeActiveTabSource = sourceIndex <= sourceConfig.activeTabIdx;
  const nextActiveTabIdxSource = movedToBeforeActiveTabSource
    ? Math.max(0, sourceConfig.activeTabIdx - 1)
    : sourceConfig.activeTabIdx;

  const movedToBeforeActiveTabTarget = targetIndex <= targetConfig.activeTabIdx;
  const nextActiveTabIdxTarget = movedToBeforeActiveTabTarget
    ? targetConfig.activeTabIdx + 1
    : targetConfig.activeTabIdx;

  return {
    configs: [
      { id: source.panelId, config: { tabs: nextTabsSource, activeTabIdx: nextActiveTabIdxSource } },
      { id: target.panelId, config: { tabs: nextTabsTarget, activeTabIdx: nextActiveTabIdxTarget } },
    ],
  };
};

export const replaceAndRemovePanels = (
  panelArgs: {|
    originalId?: ?string,
    newId?: ?string,
    idsToRemove?: string[],
  |},
  layout: MosaicNode
): ?MosaicNode => {
  const { originalId = null, newId = null, idsToRemove = [] } = panelArgs;
  const panelIds = getLeaves(layout);
  if (xor(panelIds, idsToRemove).length === 0) {
    return newId;
  }

  return uniq(compact([...idsToRemove, originalId])).reduce((currentLayout, panelIdToRemove) => {
    if (!panelIds.includes(panelIdToRemove)) {
      return currentLayout;
    } else if (currentLayout === originalId) {
      return newId;
    } else if (!currentLayout || currentLayout === panelIdToRemove) {
      return null;
    }

    const pathToNode = getPathFromNode(panelIdToRemove, currentLayout);
    const update =
      panelIdToRemove === originalId
        ? { path: pathToNode, spec: { $set: newId } }
        : createRemoveUpdate(currentLayout, pathToNode);
    return updateTree(currentLayout, [update]);
  }, layout);
};

export function getConfigsForNestedPanelsInsideTab(
  panelIdToReplace: ?string,
  tabPanelId: ?string,
  panelIdsToRemove: string[],
  savedProps: SavedProps
): ConfigsPayload[] {
  const configs = [];
  const tabPanelIds = Object.keys(savedProps).filter(isTabPanel);
  tabPanelIds.forEach((panelId) => {
    const { tabs, activeTabIdx } = getValidTabPanelConfig(panelId, savedProps);
    const tabLayout = tabs[activeTabIdx]?.layout;
    if (tabLayout && getLeaves(tabLayout).some((id) => panelIdsToRemove.includes(id))) {
      const newTabLayout = replaceAndRemovePanels(
        { originalId: panelIdToReplace, newId: tabPanelId, idsToRemove: panelIdsToRemove },
        tabLayout
      );
      const newTabConfig = updateTabPanelLayout(newTabLayout, savedProps[panelId]);
      configs.push({ id: panelId, config: newTabConfig });
    }
  });
  return configs;
}

// There are 2 cases for updating the document title based on layout:
// - Update when initializing redux store (can read layout name from URL or localStorage)
// - After URL is updated.
export function updateDocumentTitle({ search, layoutName }: { search?: string, layoutName?: string }) {
  if (!search && !layoutName) {
    return;
  }
  const params = new URLSearchParams(search || "");
  const title = params.get(TITLE_QUERY_KEY);

  // Update directly if title is present at URL.
  if (title) {
    document.title = `${title} | webviz`;
    return;
  }
  const fullLayoutName = layoutName || params.get(LAYOUT_QUERY_KEY);
  const { name } = getLayoutNameAndVersion(fullLayoutName);
  if (name) {
    document.title = `${name.split("/").pop()} | webviz`;
    return;
  }
  document.title = `webviz`;
}

export function setDefaultFields(defaultLayout: PanelsState, layout: PanelsState): PanelsState {
  const clonedLayout = cloneDeep(layout);

  // Extra checks to make sure all the common fields for panels are present.
  Object.keys(defaultLayout).forEach((fieldName) => {
    const newFieldValue = clonedLayout[fieldName];
    if (isEmpty(newFieldValue)) {
      // $FlowFixMe - Flow does not understand that the types for fieldName in both objects match
      clonedLayout[fieldName] = defaultLayout[fieldName];
    }
  });
  return clonedLayout;
}

const PARAMS_TO_DECODE = new Set([LAYOUT_URL_QUERY_KEY]);
export function stringifyParams(params: URLSearchParams): string {
  const stringifiedParams = [];
  for (const [key, value] of params) {
    if (PARAMS_TO_DECODE.has(key)) {
      stringifiedParams.push(`${key}=${decodeURIComponent(value)}`);
    } else {
      stringifiedParams.push(`${key}=${encodeURIComponent(value)}`);
    }
  }
  return stringifiedParams.length ? `?${stringifiedParams.join("&")}` : "";
}
