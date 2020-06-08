// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEmpty, pick, cloneDeep } from "lodash";
import { getLeaves, updateTree, getPathFromNode } from "react-mosaic-component";

import type { ActionTypes } from "webviz-core/src/actions";
import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type { State } from "webviz-core/src/reducers";
import type {
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
  layout: MosaicNode,
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
// getInitialPanelsState will be called once when the store initializes this reducer.
// It is a function instead of a const so we can manipulate localStorage in test setup
// and when we create new stores they will use the new values in localStorage
function getInitialPanelsState(): PanelsState {
  let newPanelsState = storage.get(GLOBAL_STATE_STORAGE_KEY);
  if (newPanelsState) {
    // use the new global state storage directly if it's present
    setStorageStateAndFallbackToDefault(newPanelsState);
    // don't use the old storage but simply remove the keys in case both new key and old keys are present
    getOldStorageAndRemoveKey();
  } else {
    newPanelsState = getOldStorageAndRemoveKey();
  }

  return getGlobalHooks().migratePanels(newPanelsState);
}

function changePanelLayout(
  state: PanelsState,
  { layout, trimSavedProps = true }: ChangePanelLayoutPayload
): PanelsState {
  const panelIds = getLeaves(layout || state.layout);
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

    case "SPLIT_PANEL":
      newState.panels = splitPanel(state, action.payload);
      break;

    case "SWAP_PANEL":
      newState.panels = swapPanel(state, action.payload);
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
