// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEmpty, isEqual, dropRight, pick, cloneDeep } from "lodash";
import {
  getLeaves,
  updateTree,
  getPathFromNode,
  createDragToUpdates,
  createRemoveUpdate,
  createHideUpdate,
  getNodeAtPath,
  type MosaicDropTargetPosition,
  type MosaicPath,
} from "react-mosaic-component";

import type { ActionTypes } from "webviz-core/src/actions";
import type { StartDragPayload, EndDragPayload } from "webviz-core/src/actions/panels";
import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type { State } from "webviz-core/src/reducers";
import type {
  PanelConfig,
  ConfigsPayload,
  CreateTabPanelPayload,
  MosaicNode,
  ChangePanelLayoutPayload,
  SaveConfigsPayload,
  SaveFullConfigPayload,
  ImportPanelLayoutPayload,
  SavedProps,
  UserNodes,
  PlaybackConfig,
} from "webviz-core/src/types/panels";
import { TAB_PANEL_TYPE } from "webviz-core/src/util/globalConstants";
import {
  updateTabPanelLayout,
  replaceAndRemovePanels,
  getPanelIdForType,
  getPanelTypeFromId,
  getPanelIdsInsideTabPanels,
  DEFAULT_TAB_PANEL_CONFIG,
  getConfigsForNestedPanelsInsideTab,
  getAllPanelIds,
  inlineTabPanelLayouts,
  getSaveConfigsPayloadForAddedPanel,
  addPanelToTab,
  reorderTabWithinTabPanel,
  moveTabBetweenTabPanels,
  createAddUpdates,
  removePanelFromTabPanel,
} from "webviz-core/src/util/layout";
import Storage from "webviz-core/src/util/Storage";

const storage = new Storage();

export const GLOBAL_STATE_STORAGE_KEY = "webvizGlobalState";
export const defaultPlaybackConfig: PlaybackConfig = {
  speed: 0.2,
  messageOrder: "receiveTime",
};

// TODO(Audrey): remove the storage migration logic and fallback to empty in late 2019
const OLD_KEYS = {
  layout: "panels.layout",
  savedProps: "panels.savedProps",
  globalData: "panels.globalData",
  globalVariables: "panels.globalVariables",
  userNodes: "panels.userNodes",
  linkedGlobalVariables: "panels.linkedGlobalVariables",
};

export type PanelsState = {
  layout: ?MosaicNode,
  // We store config for each panel in a hash keyed by the panel id.
  // This should at some point be renamed to `config` or `configById` or so,
  // but it's inconvenient to have this diverge from `PANEL_PROPS_KEY`.
  savedProps: SavedProps,
  globalVariables: GlobalVariables,
  // old state which is migrated to globalVariables. Keeping it here to satisfy flow
  globalData?: GlobalVariables,
  userNodes: UserNodes,
  linkedGlobalVariables: LinkedGlobalVariables,
  playbackConfig: PlaybackConfig,
  restrictedTopics?: string[],
  version?: number,
};

export const setStoredLayout = (layout: PanelsState) => {
  storage.set(GLOBAL_STATE_STORAGE_KEY, layout);
};

export function setStorageStateAndFallbackToDefault(globalState: any = {}) {
  const newPanelsState = { ...globalState };
  const defaultGlobalStates = getGlobalHooks().getDefaultGlobalStates();
  // extra checks to make sure all the common fields are present
  Object.keys(defaultGlobalStates).forEach((fieldName) => {
    const newFieldValue = globalState[fieldName];
    if (isEmpty(newFieldValue)) {
      newPanelsState[fieldName] = defaultGlobalStates[fieldName];
    }
  });

  setStoredLayout(newPanelsState);
  return newPanelsState;
}

function getOldStorageAndRemoveKey() {
  // retrieve state from the old storages and delete those afterwards
  const defaultGlobalStates = getGlobalHooks().getDefaultGlobalStates();
  const newPanelsState = cloneDeep(defaultGlobalStates);
  Object.keys(OLD_KEYS).forEach((fieldName) => {
    const storageKey = OLD_KEYS[fieldName];
    const oldStorage = storage.get(storageKey);
    if (oldStorage) {
      newPanelsState[fieldName] = oldStorage;
      storage.remove(storageKey);
    }
  });

  return newPanelsState;
}

// initialPanelsState will be initialized once when the store initializes this reducer. It is
// initialized lazily so we can manipulate localStorage in test setup and when we create new stores
// new stores they will use the new values in localStorage. Reinitializing it for every action is
// too expensive.
let initialPanelsState;
function getInitialPanelsState(): PanelsState {
  if (initialPanelsState == null) {
    let newPanelsState = storage.get(GLOBAL_STATE_STORAGE_KEY);
    if (newPanelsState) {
      // use the new global state storage directly if it's present
      setStorageStateAndFallbackToDefault(newPanelsState);
      // don't use the old storage but simply remove the keys in case both new key and old keys are present
      getOldStorageAndRemoveKey();
    } else {
      newPanelsState = getOldStorageAndRemoveKey();
    }
    initialPanelsState = getGlobalHooks().migratePanels(newPanelsState);
  }
  return initialPanelsState;
}

function changePanelLayout(
  state: PanelsState,
  { layout, trimSavedProps = true }: ChangePanelLayoutPayload
): PanelsState {
  const panelIds = getLeaves(layout).filter((panelId) => !isEmpty(panelId));
  const panelIdsInsideTabPanels = getPanelIdsInsideTabPanels(panelIds, state.savedProps);
  // Filter savedProps in case a panel was removed from the layout
  // We don't want its savedProps hanging around forever
  const savedProps = trimSavedProps
    ? pick(state.savedProps, [...panelIdsInsideTabPanels, ...panelIds])
    : state.savedProps;
  return { ...state, savedProps, layout };
}

function savePanelConfigs(state: PanelsState, payload: SaveConfigsPayload): PanelsState {
  const { configs } = payload;
  // imutable update of key/value pairs
  const newSavedProps = configs.reduce((currentSavedProps, { id, config, defaultConfig = {}, override }) => {
    return override
      ? { ...currentSavedProps, [id]: config }
      : {
          ...currentSavedProps,
          [id]: {
            // merge new config with old one
            // similar to how this.setState merges props
            // When updating the panel state, we merge the new config (which may be just a part of config) with the old config and the default config every time.
            // Previously this was done inside the component, but since the lifecycle of Redux is Action => Reducer => new state => Component,
            // dispatching an update to the panel state is not instant and can take some time to propagate back to the component.
            // If the existing panel config is the complete config1, and two actions were fired in quick succession the component with partial config2 and config3,
            // the correct behavior is to merge config2 with config1 and dispatch that, and then merge config 3 with the combined config2 and config1.
            // Instead we had stale state so we would merge config3 with config1 and overwrite any keys that exist in config2 but do not exist in config3.
            // The solution is to do this merge inside the reducer itself, since the state inside the reducer is never stale (unlike the state inside the component).
            ...defaultConfig,
            ...currentSavedProps[id],
            ...config,
          },
        };
  }, state.savedProps);
  const tabPanelConfigSaved = configs.find(({ id }) => getPanelTypeFromId(id) === TAB_PANEL_TYPE);
  if (tabPanelConfigSaved) {
    const panelIds = getLeaves(state.layout);
    const panelIdsInsideTabPanels = getPanelIdsInsideTabPanels(panelIds, newSavedProps);
    // Filter savedProps in case a panel was removed from a Tab layout
    // We don't want its savedProps hanging around forever
    return { ...state, savedProps: pick(newSavedProps, [...panelIdsInsideTabPanels, ...panelIds]) };
  }
  return { ...state, savedProps: newSavedProps };
}

function saveFullPanelConfig(state: PanelsState, payload: SaveFullConfigPayload): PanelsState {
  const { panelType, perPanelFunc } = payload;
  const newProps = { ...state.savedProps };
  if (panelType && perPanelFunc) {
    const fullConfig = state.savedProps;
    Object.keys(fullConfig).forEach((panelId) => {
      if (getPanelTypeFromId(panelId) === panelType) {
        const newPanelConfig = perPanelFunc(fullConfig[panelId]);
        if (newPanelConfig) {
          newProps[panelId] = newPanelConfig;
        }
      }
    });
  }

  return { ...state, savedProps: newProps };
}

const closePanel = (panelsState: PanelsState, { tabId, root, path }): PanelsState => {
  if (tabId) {
    const saveConfigsPayload = removePanelFromTabPanel(path, panelsState.savedProps[tabId], tabId);
    return savePanelConfigs(panelsState, saveConfigsPayload);
  } else if (typeof root === "string") {
    // When layout consists of 1 panel, clear the layout
    return changePanelLayout(panelsState, { layout: null });
  }
  const update = createRemoveUpdate(root, path);
  const newLayout = updateTree(root, [update]);
  return changePanelLayout(panelsState, { layout: newLayout });
};

const splitPanel = (state, { id, tabId, direction, config, root, path }): PanelsState => {
  const type = getPanelTypeFromId(id);
  const newId = getPanelIdForType(type);
  let newPanelsState = { ...state.panels };
  const { savedProps } = newPanelsState;
  if (tabId) {
    const activeTabLayout = savedProps[tabId].tabs[savedProps[tabId].activeTabIdx].layout;
    const newTabLayout = updateTree(activeTabLayout, [
      { path: getPathFromNode(id, activeTabLayout), spec: { $set: { first: id, second: newId, direction } } },
    ]);
    const newTabConfig = updateTabPanelLayout(newTabLayout, savedProps[tabId]);
    newPanelsState = savePanelConfigs(newPanelsState, {
      configs: [{ id: tabId, config: newTabConfig }, { id: newId, config }],
    });
  } else {
    newPanelsState = changePanelLayout(newPanelsState, {
      layout: updateTree(root, [{ path, spec: { $set: { first: id, second: newId, direction } } }]),
      trimSavedProps: type !== TAB_PANEL_TYPE,
    });

    const relatedConfigs =
      type === TAB_PANEL_TYPE
        ? getPanelIdsInsideTabPanels([id], savedProps).reduce(
            (res, panelId) => ({ ...res, [panelId]: savedProps[panelId] }),
            {}
          )
        : null;
    newPanelsState = savePanelConfigs(
      newPanelsState,
      getSaveConfigsPayloadForAddedPanel({ id: newId, config, relatedConfigs })
    );
  }
  return newPanelsState;
};

const swapPanel = (state, { tabId, originalId, type, config, relatedConfigs, root, path }): PanelsState => {
  const newId = getPanelIdForType(type);
  let newPanelsState = { ...state.panels };
  // For a panel inside a Tab panel, update the Tab panel's tab layouts via savedProps
  if (tabId && originalId) {
    const tabSavedProps = newPanelsState.savedProps[tabId];
    const activeTabLayout = tabSavedProps.tabs[tabSavedProps.activeTabIdx].layout;
    const newTabLayout = replaceAndRemovePanels({ originalId, newId }, activeTabLayout);

    const newTabConfig = updateTabPanelLayout(newTabLayout, tabSavedProps);
    newPanelsState = savePanelConfigs(newPanelsState, { configs: [{ id: tabId, config: newTabConfig }] });
  } else {
    newPanelsState = changePanelLayout(newPanelsState, {
      layout: updateTree(root, [{ path, spec: { $set: newId } }]),
      trimSavedProps: type !== TAB_PANEL_TYPE,
    });
  }

  if (config) {
    newPanelsState = savePanelConfigs(
      newPanelsState,
      getSaveConfigsPayloadForAddedPanel({ id: newId, config, relatedConfigs })
    );
  }
  return newPanelsState;
};

const createTabPanelWithSingleTab = (
  state: State,
  { idToReplace, layout, idsToRemove }: CreateTabPanelPayload
): State => {
  const newId = getPanelIdForType(TAB_PANEL_TYPE);
  const { savedProps } = state.panels;
  // Build the layout for the new tab
  const layoutWithInlinedTabs = inlineTabPanelLayouts(layout, savedProps, idsToRemove);
  const panelIdsNotInNewTab = getAllPanelIds(layout, savedProps).filter((leaf) => !idsToRemove.includes(leaf));
  const tabLayout = replaceAndRemovePanels({ idsToRemove: panelIdsNotInNewTab }, layoutWithInlinedTabs);

  const newLayout = replaceAndRemovePanels({ originalId: idToReplace, newId, idsToRemove }, layout);
  let newPanelsState = changePanelLayout(state.panels, { layout: newLayout || "", trimSavedProps: false });

  const tabPanelConfig = {
    id: newId,
    config: { ...DEFAULT_TAB_PANEL_CONFIG, tabs: [{ title: "1", layout: tabLayout }] },
  };
  const nestedPanelConfigs = getConfigsForNestedPanelsInsideTab(idToReplace, newId, idsToRemove, savedProps);
  newPanelsState = savePanelConfigs(newPanelsState, { configs: [tabPanelConfig, ...nestedPanelConfigs] });
  return { ...state, panels: newPanelsState, mosaic: { ...state.mosaic, selectedPanelIds: [newId] } };
};

export const createTabPanelWithMultipleTabs = (
  state: State,
  { idToReplace, layout, idsToRemove }: CreateTabPanelPayload
): State => {
  const { savedProps } = state.panels;
  const newId = getPanelIdForType(TAB_PANEL_TYPE);
  const newLayout = replaceAndRemovePanels({ originalId: idToReplace, newId, idsToRemove }, layout);
  let newPanelsState = changePanelLayout({ ...state.panels }, { layout: newLayout || "", trimSavedProps: false });

  const tabs = idsToRemove.map((panelId) => ({ title: getPanelTypeFromId(panelId), layout: panelId }));
  const tabPanelConfig = { id: newId, config: { ...DEFAULT_TAB_PANEL_CONFIG, tabs } };
  const nestedPanelConfigs = getConfigsForNestedPanelsInsideTab(idToReplace, newId, idsToRemove, savedProps);
  newPanelsState = savePanelConfigs(newPanelsState, { configs: [tabPanelConfig, ...nestedPanelConfigs] });

  return {
    ...state,
    panels: newPanelsState,
    mosaic: { ...state.mosaic, selectedPanelIds: [newId] },
  };
};

function importPanelLayout(state: PanelsState, payload: ImportPanelLayoutPayload): PanelsState {
  let migratedPayload = {};
  try {
    migratedPayload = getGlobalHooks().migratePanels(payload);
  } catch (err) {
    console.error("Error importing layout", payload, err);
    return state;
  }

  const newPanelsState = {
    layout: migratedPayload.layout || {},
    savedProps: migratedPayload.savedProps || {},
    globalVariables: migratedPayload.globalVariables || {},
    userNodes: migratedPayload.userNodes || {},
    linkedGlobalVariables: migratedPayload.linkedGlobalVariables || [],
    playbackConfig: migratedPayload.playbackConfig || defaultPlaybackConfig,
    ...(migratedPayload.restrictedTopics ? { restrictedTopics: migratedPayload.restrictedTopics } : undefined),
  };

  return newPanelsState;
}

const moveTab = (panelsState: PanelsState, { source, target }): PanelsState => {
  const saveConfigsPayload =
    source.panelId === target.panelId
      ? reorderTabWithinTabPanel({ source, target, savedProps: panelsState.savedProps })
      : moveTabBetweenTabPanels({ source, target, savedProps: panelsState.savedProps });
  return savePanelConfigs(panelsState, saveConfigsPayload);
};

const addPanel = (panelsState: PanelsState, { tabId, layout, type, config, relatedConfigs }) => {
  const id = getPanelIdForType(type);
  let newPanelsState = { ...panelsState };
  let saveConfigsPayload = { configs: [] };
  if (config) {
    saveConfigsPayload = getSaveConfigsPayloadForAddedPanel({ id, config, relatedConfigs });
  }
  const changeLayoutPayload = {
    layout: isEmpty(layout) ? id : { direction: "row", first: id, second: layout },
    trimSavedProps: !relatedConfigs,
  };
  if (tabId && typeof changeLayoutPayload.layout === "string") {
    newPanelsState = savePanelConfigs(newPanelsState, {
      configs: [
        {
          id: tabId,
          config: updateTabPanelLayout(changeLayoutPayload.layout, {
            ...DEFAULT_TAB_PANEL_CONFIG,
            ...panelsState.savedProps[tabId],
          }),
        },
      ],
    });
  } else {
    newPanelsState = changePanelLayout(newPanelsState, changeLayoutPayload);
  }
  newPanelsState = savePanelConfigs(newPanelsState, saveConfigsPayload);
  return newPanelsState;
};

const dropPanel = (
  panelsState: PanelsState,
  { newPanelType, destinationPath = [], position, tabId, config, relatedConfigs }
) => {
  const id = getPanelIdForType(newPanelType);

  const configs = [];
  // This means we've dragged into a Tab panel
  if (tabId) {
    const { configs: newConfigs } = addPanelToTab(id, destinationPath, position, panelsState.savedProps[tabId], tabId);
    configs.push(...newConfigs);
  }

  const newLayout = tabId
    ? panelsState.layout
    : updateTree(panelsState.layout, createAddUpdates(panelsState.layout, id, destinationPath, position));

  // 'relatedConfigs' are used in Tab panel presets, so that the panels'
  // respective configs will be saved globally.
  if (config) {
    const { configs: newConfigs } = getSaveConfigsPayloadForAddedPanel({ id, config, relatedConfigs });
    configs.push(...newConfigs);
  }

  let newPanelsState = changePanelLayout(panelsState, { layout: newLayout, trimSavedProps: !relatedConfigs });
  newPanelsState = savePanelConfigs(newPanelsState, { configs });
  return newPanelsState;
};
const dragWithinSameTab = (
  panelsState: PanelsState,
  {
    originalLayout,
    sourceTabId,
    position,
    destinationPath,
    ownPath,
    sourceTabConfig,
    sourceTabChildConfigs,
  }: {|
    originalLayout: MosaicNode,
    sourceTabId: string,
    position: ?MosaicDropTargetPosition,
    destinationPath: ?MosaicPath,
    ownPath: MosaicPath,
    sourceTabConfig: PanelConfig,
    sourceTabChildConfigs: ConfigsPayload[],
  |}
): PanelsState => {
  const currentTabLayout = sourceTabConfig.tabs[sourceTabConfig.activeTabIdx].layout;
  let newPanelsState = { ...panelsState };
  if (typeof currentTabLayout === "string") {
    newPanelsState = changePanelLayout(panelsState, { layout: originalLayout, trimSavedProps: false });
    // We assume `begin` handler already removed tab from config. Here it is replacing it, or keeping it as is
    newPanelsState = savePanelConfigs(newPanelsState, {
      configs: [
        { id: sourceTabId, config: updateTabPanelLayout(currentTabLayout, sourceTabConfig) },
        ...sourceTabChildConfigs,
      ],
    });
  } else {
    const updates = createDragToUpdates(currentTabLayout, ownPath, destinationPath, position);
    const newTree = updateTree(currentTabLayout, updates);

    newPanelsState = changePanelLayout(panelsState, { layout: originalLayout, trimSavedProps: false });
    newPanelsState = savePanelConfigs(newPanelsState, {
      configs: [
        { id: sourceTabId, config: updateTabPanelLayout(newTree, panelsState.savedProps[sourceTabId]) },
        ...sourceTabChildConfigs,
      ],
    });
  }
  return newPanelsState;
};

const dragToMainFromTab = (
  panelsState,
  {
    originalLayout,
    sourceTabId,
    position,
    destinationPath,
    ownPath,
    sourceTabConfig,
    sourceTabChildConfigs,
  }: {|
    originalLayout: MosaicNode,
    sourceTabId: string,
    position: MosaicDropTargetPosition,
    destinationPath: MosaicPath,
    ownPath: MosaicPath,
    sourceTabConfig: PanelConfig,
    sourceTabChildConfigs: ConfigsPayload[],
  |}
): PanelsState => {
  const currentTabLayout = sourceTabConfig.tabs[sourceTabConfig.activeTabIdx].layout;
  // Remove panel from tab layout
  const saveConfigsPayload = removePanelFromTabPanel(ownPath, panelsState.savedProps[sourceTabId], sourceTabId);
  const panelConfigs = {
    ...saveConfigsPayload,
    configs: [...saveConfigsPayload.configs, ...sourceTabChildConfigs],
  };

  // Insert it into main layout
  const currentNode = getNodeAtPath(currentTabLayout, ownPath);
  const newLayout = updateTree(
    originalLayout,
    createAddUpdates(originalLayout, currentNode, destinationPath, position)
  );

  let newPanelsState = changePanelLayout(panelsState, { layout: newLayout, trimSavedProps: false });
  newPanelsState = savePanelConfigs(newPanelsState, panelConfigs);
  return newPanelsState;
};

const dragToTabFromMain = (
  panelsState: PanelsState,
  {
    originalLayout,
    panelId,
    targetTabId,
    position,
    destinationPath,
    ownPath,
    targetTabConfig,
    sourceTabChildConfigs,
  }: {|
    originalLayout: MosaicNode,
    panelId: string,
    targetTabId: string,
    position: ?MosaicDropTargetPosition,
    destinationPath: ?MosaicPath,
    ownPath: MosaicPath,
    targetTabConfig: ?PanelConfig,
    sourceTabChildConfigs: ConfigsPayload[],
  |}
): PanelsState => {
  const saveConfigsPayload = addPanelToTab(panelId, destinationPath, position, targetTabConfig, targetTabId);
  const panelConfigs = {
    ...saveConfigsPayload,
    configs: [...saveConfigsPayload.configs, ...sourceTabChildConfigs],
  };
  const update = createRemoveUpdate(originalLayout, ownPath);
  const newLayout = updateTree(originalLayout, [update]);
  let newPanelsState = changePanelLayout(panelsState, { layout: newLayout, trimSavedProps: false });
  newPanelsState = savePanelConfigs(newPanelsState, { configs: panelConfigs.configs });
  return newPanelsState;
};

const dragToTabFromTab = (
  panelsState: PanelsState,
  {
    originalLayout,
    panelId,
    sourceTabId,
    targetTabId,
    position,
    destinationPath,
    ownPath,
    targetTabConfig,
    sourceTabConfig,
    sourceTabChildConfigs,
  }: {|
    originalLayout: MosaicNode,
    panelId: string,
    sourceTabId: string,
    targetTabId: string,
    position: ?MosaicDropTargetPosition,
    destinationPath: ?MosaicPath,
    ownPath: MosaicPath,
    targetTabConfig: ?PanelConfig,
    sourceTabConfig: PanelConfig,
    sourceTabChildConfigs: ConfigsPayload[],
  |}
): PanelsState => {
  // Remove panel from tab layout
  const { configs: fromTabConfigs } = removePanelFromTabPanel(ownPath, sourceTabConfig, sourceTabId);

  // Insert it into another tab
  const { configs: toTabConfigs } = addPanelToTab(panelId, destinationPath, position, targetTabConfig, targetTabId);
  let newPanelsState = changePanelLayout(panelsState, { layout: originalLayout, trimSavedProps: false });
  newPanelsState = savePanelConfigs(newPanelsState, {
    configs: [...fromTabConfigs, ...toTabConfigs, ...sourceTabChildConfigs],
  });
  return newPanelsState;
};

const startDrag = (panelsState: PanelsState, { path, sourceTabId }: StartDragPayload): PanelsState => {
  if (path.length) {
    if (sourceTabId) {
      const tabConfig = panelsState.savedProps[sourceTabId];
      const activeLayout = tabConfig.tabs[tabConfig.activeTabIdx].layout;
      const newTabLayout = updateTree(activeLayout, [createHideUpdate(path)]);
      const newTabConfig = updateTabPanelLayout(newTabLayout, tabConfig);
      return savePanelConfigs(panelsState, { configs: [{ id: sourceTabId, config: newTabConfig }] });
    }
    return changePanelLayout(panelsState, {
      layout: updateTree(panelsState.layout, [createHideUpdate(path)]),
      trimSavedProps: false,
    });
  } else if (sourceTabId) {
    // If we've dragged a panel from a single panel tab layout, remove that panel
    const sourceTabConfig = panelsState.savedProps[sourceTabId];
    return savePanelConfigs(panelsState, {
      configs: [{ id: sourceTabId, config: updateTabPanelLayout(null, sourceTabConfig) }],
    });
  }
  return panelsState;
};

const endDrag = (panelsState: PanelsState, dragPayload: EndDragPayload): PanelsState => {
  const {
    originalLayout,
    originalSavedProps,
    panelId,
    sourceTabId,
    targetTabId,
    position,
    destinationPath,
    ownPath,
  } = dragPayload;
  const toMainFromTab = sourceTabId && !targetTabId;
  const toTabfromMain = !sourceTabId && targetTabId;
  const toTabfromTab = sourceTabId && targetTabId;
  const withinSameTab = sourceTabId === targetTabId && toTabfromTab; // In case it's simply a drag within the main layout.

  const sourceTabConfig = sourceTabId ? originalSavedProps[sourceTabId] : null;
  const targetTabConfig = targetTabId ? originalSavedProps[targetTabId] : null;
  const panelIdsInsideTabPanels = (sourceTabId && getPanelIdsInsideTabPanels([sourceTabId], originalSavedProps)) || [];
  const sourceTabChildConfigs = panelIdsInsideTabPanels
    .filter((id) => !!originalSavedProps[id])
    .map((id) => ({ id, config: originalSavedProps[id] }));

  if (withinSameTab && sourceTabConfig && sourceTabId) {
    return dragWithinSameTab(panelsState, {
      originalLayout,
      sourceTabId,
      position,
      destinationPath,
      ownPath,
      sourceTabConfig,
      sourceTabChildConfigs,
    });
  }

  if (toMainFromTab && sourceTabConfig && sourceTabId && destinationPath && position) {
    return dragToMainFromTab(panelsState, {
      originalLayout,
      sourceTabId,
      position,
      destinationPath,
      ownPath,
      sourceTabConfig,
      sourceTabChildConfigs,
    });
  }

  if (toTabfromMain && targetTabId) {
    return dragToTabFromMain(panelsState, {
      originalLayout,
      panelId,
      targetTabId,
      position,
      destinationPath,
      ownPath,
      targetTabConfig,
      sourceTabChildConfigs,
    });
  }

  if (toTabfromTab && sourceTabConfig && sourceTabId && targetTabId) {
    return dragToTabFromTab(panelsState, {
      originalLayout,
      panelId,
      sourceTabId,
      targetTabId,
      position,
      destinationPath,
      ownPath,
      targetTabConfig,
      sourceTabConfig,
      sourceTabChildConfigs,
    });
  }

  if (typeof originalLayout === "string") {
    return changePanelLayout(panelsState, { layout: originalLayout, trimSavedProps: false });
  }

  if (position != null && destinationPath != null && !isEqual(destinationPath, ownPath)) {
    const updates = createDragToUpdates(originalLayout, ownPath, destinationPath, position);
    const newLayout = updateTree(originalLayout, updates);
    return changePanelLayout(panelsState, { layout: newLayout, trimSavedProps: false });
  }

  const newLayout = updateTree(originalLayout, [
    { path: dropRight(ownPath), spec: { splitPercentage: { $set: null } } },
  ]);
  return changePanelLayout(panelsState, { layout: newLayout, trimSavedProps: false });
};

export default function panelsReducer(state: State, action: ActionTypes): State {
  let newState = { ...state, panels: { ...getInitialPanelsState(), ...state.panels } };
  switch (action.type) {
    case "CHANGE_PANEL_LAYOUT":
      // don't allow the last panel to be removed
      newState.panels = changePanelLayout(newState.panels, action.payload);
      break;

    case "SAVE_PANEL_CONFIGS":
      newState.panels = savePanelConfigs(newState.panels, action.payload);
      break;

    case "SAVE_FULL_PANEL_CONFIG":
      newState.panels = saveFullPanelConfig(newState.panels, action.payload);
      break;

    case "CREATE_TAB_PANEL":
      newState = action.payload.singleTab
        ? createTabPanelWithSingleTab(newState, action.payload)
        : createTabPanelWithMultipleTabs(newState, action.payload);
      break;

    case "IMPORT_PANEL_LAYOUT":
      newState.panels = importPanelLayout(newState.panels, action.payload);
      break;

    case "OVERWRITE_GLOBAL_DATA":
      newState.panels.globalVariables = action.payload;
      break;

    case "SET_GLOBAL_DATA": {
      const globalVariables = { ...newState.panels.globalVariables, ...action.payload };
      Object.keys(globalVariables).forEach((key) => {
        if (globalVariables[key] === undefined) {
          delete globalVariables[key];
        }
      });
      newState.panels.globalVariables = globalVariables;
      break;
    }

    case "SET_USER_NODES": {
      const userNodes = { ...newState.panels.userNodes, ...action.payload };
      Object.keys(action.payload).forEach((key) => {
        if (userNodes[key] === undefined) {
          delete userNodes[key];
        }
      });
      newState.panels.userNodes = userNodes;
      break;
    }

    case "SET_LINKED_GLOBAL_VARIABLES":
      newState.panels.linkedGlobalVariables = action.payload;
      break;

    case "SET_PLAYBACK_CONFIG":
      newState.panels.playbackConfig = { ...newState.panels.playbackConfig, ...action.payload };
      break;

    case "CLOSE_PANEL":
      newState.panels = closePanel(newState.panels, action.payload);
      break;

    case "SPLIT_PANEL":
      newState.panels = splitPanel(state, action.payload);
      break;

    case "SWAP_PANEL":
      newState.panels = swapPanel(state, action.payload);
      break;

    case "MOVE_TAB":
      newState.panels = moveTab(newState.panels, action.payload);
      break;

    case "ADD_PANEL":
      newState.panels = addPanel(newState.panels, action.payload);
      break;

    case "DROP_PANEL":
      newState.panels = dropPanel(newState.panels, action.payload);
      break;

    case "START_DRAG":
      newState.panels = startDrag(newState.panels, action.payload);
      break;

    case "END_DRAG":
      newState.panels = endDrag(newState.panels, action.payload);
      break;

    default:
      break;
  }

  if (action.payload && action.payload.skipSettingLocalStorage) {
    return newState;
  }
  setStoredLayout(newState.panels);
  return newState;
}
