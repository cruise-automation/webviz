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
import type { State, PersistedState } from "webviz-core/src/reducers";
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
import {
  TAB_PANEL_TYPE,
  LAYOUT_QUERY_KEY,
  LAYOUT_URL_QUERY_KEY,
  PATCH_QUERY_KEY,
} from "webviz-core/src/util/globalConstants";
import {
  setDefaultFields,
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
  stringifyParams,
  updateDocumentTitle,
} from "webviz-core/src/util/layout";
import Storage from "webviz-core/src/util/Storage";

const storage = new Storage();

export const GLOBAL_STATE_STORAGE_KEY = "webvizGlobalState";
export const defaultPlaybackConfig: PlaybackConfig = {
  speed: 0.2,
  messageOrder: "receiveTime",
  timeDisplayMethod: "ROS",
};

export type PanelsState = {|
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
|};

export const setPersistedStateInLocalStorage = (persistedState: PersistedState) => {
  storage.setItem(GLOBAL_STATE_STORAGE_KEY, persistedState);
};

// initialPersistedState will be initialized once when the store initializes this reducer. It is
// initialized lazily so we can manipulate localStorage in test setup and when we create new stores
// new stores they will use the new values in localStorage. Re-initializing it for every action is
// too expensive.
let initialPersistedState;
export function getInitialPersistedStateAndMaybeUpdateLocalStorageAndURL(history: any): PersistedState {
  if (initialPersistedState == null) {
    const defaultPersistedState = Object.freeze(getGlobalHooks().getDefaultPersistedState());
    const oldPersistedState: any = storage.getItem(GLOBAL_STATE_STORAGE_KEY);

    const newPersistedState = cloneDeep(defaultPersistedState);

    const { search: currentSearch, pathname } = history.location;
    const currentSearchParams = new URLSearchParams(currentSearch);
    const oldFetchedLayoutState = oldPersistedState?.fetchedLayout;
    const oldPersistedSearch = oldPersistedState?.search;
    const fetchedLayoutDataFromLocalStorage = oldFetchedLayoutState?.data;

    let isInitializedFromLocalStorage = false;

    if (oldFetchedLayoutState) {
      newPersistedState.fetchedLayout = oldFetchedLayoutState;
    }
    let fetchedLayoutName;

    // 1. Get layout from localStorage and update URL if there are no layout params and the fetchedLayout is not from layout-url param.
    if (
      fetchedLayoutDataFromLocalStorage &&
      !oldFetchedLayoutState.isFromLayoutUrlParam &&
      !currentSearchParams.get(LAYOUT_QUERY_KEY) &&
      !currentSearchParams.get(LAYOUT_URL_QUERY_KEY)
    ) {
      if (oldPersistedSearch) {
        // Get the `layout` and `patch` params by reading `persistedState.search` from localStorage and update the URL.
        const localStorageParams = new URLSearchParams(oldPersistedSearch);
        const layoutParamVal = localStorageParams.get(LAYOUT_QUERY_KEY);
        const patchParamVal = localStorageParams.get(PATCH_QUERY_KEY);
        if (layoutParamVal) {
          currentSearchParams.set(LAYOUT_QUERY_KEY, layoutParamVal);
        }
        if (patchParamVal) {
          currentSearchParams.set(PATCH_QUERY_KEY, patchParamVal);
        }
      } else {
        // Read layout name and version from fetchedLayout.
        const { name, releasedVersion, fileSuffix } = fetchedLayoutDataFromLocalStorage;
        fetchedLayoutName = name;
        let layoutParam = name;
        if (fileSuffix) {
          layoutParam = `${name}@${fileSuffix}`;
        } else if (releasedVersion) {
          layoutParam = `${name}@${releasedVersion}`;
        }
        currentSearchParams.set(LAYOUT_QUERY_KEY, layoutParam);
      }

      isInitializedFromLocalStorage = true;
      const newSearch = stringifyParams(currentSearchParams);
      history.push({ pathname, search: newSearch });
      // Store the current search in localStorage. It'll get updated later when user makes layout edits.
      newPersistedState.search = newSearch;
    }
    updateDocumentTitle({ layoutName: fetchedLayoutName, search: newPersistedState.search || currentSearch });

    // 2. Set fetchedLayout state if it's available in localStorage.
    if (fetchedLayoutDataFromLocalStorage) {
      // Set `isInitializedFromLocalStorage` flag to skip initial layout fetch.
      newPersistedState.fetchedLayout = {
        ...oldFetchedLayoutState,
        data: {
          ...fetchedLayoutDataFromLocalStorage,
          content: getGlobalHooks().migratePanels(fetchedLayoutDataFromLocalStorage.content),
        },
        isInitializedFromLocalStorage,
      };
      newPersistedState.search = oldPersistedState.search;
    }

    // 3. Handle panel state.
    if (oldPersistedState?.panels) {
      newPersistedState.panels = oldPersistedState.panels;
    } else if (oldPersistedState?.layout) {
      // The localStorage is on old format with {layout, savedProps...}
      newPersistedState.panels = oldPersistedState;
    }
    newPersistedState.panels = setDefaultFields(defaultPersistedState.panels, newPersistedState.panels);

    // Migrate panels and store in localStorage.
    const migratedPanels = getGlobalHooks().migratePanels(newPersistedState.panels);
    initialPersistedState = {
      ...newPersistedState,
      panels: { ...defaultPersistedState.panels, ...migratedPanels },
    };

    setPersistedStateInLocalStorage(initialPersistedState);
  }

  return initialPersistedState;
}

// Export for testing.
export function resetInitialPersistedState() {
  initialPersistedState = undefined;
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
  let newPanelsState = { ...state.persistedState.panels };
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
  let newPanelsState = { ...state.persistedState.panels };
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
  const { savedProps } = state.persistedState.panels;
  // Build the layout for the new tab
  const layoutWithInlinedTabs = inlineTabPanelLayouts(layout, savedProps, idsToRemove);
  const panelIdsNotInNewTab = getAllPanelIds(layout, savedProps).filter((leaf) => !idsToRemove.includes(leaf));
  const tabLayout = replaceAndRemovePanels({ idsToRemove: panelIdsNotInNewTab }, layoutWithInlinedTabs);

  const newLayout = replaceAndRemovePanels({ originalId: idToReplace, newId, idsToRemove }, layout);
  let newPanelsState = changePanelLayout(state.persistedState.panels, {
    layout: newLayout || "",
    trimSavedProps: false,
  });

  const tabPanelConfig = {
    id: newId,
    config: { ...DEFAULT_TAB_PANEL_CONFIG, tabs: [{ title: "1", layout: tabLayout }] },
  };
  const nestedPanelConfigs = getConfigsForNestedPanelsInsideTab(idToReplace, newId, idsToRemove, savedProps);
  newPanelsState = savePanelConfigs(newPanelsState, { configs: [tabPanelConfig, ...nestedPanelConfigs] });
  return {
    ...state,
    mosaic: { ...state.mosaic, selectedPanelIds: [newId] },
    persistedState: { ...state.persistedState, panels: newPanelsState },
  };
};

export const createTabPanelWithMultipleTabs = (
  state: State,
  { idToReplace, layout, idsToRemove }: CreateTabPanelPayload
): State => {
  const { savedProps } = state.persistedState.panels;
  const newId = getPanelIdForType(TAB_PANEL_TYPE);
  const newLayout = replaceAndRemovePanels({ originalId: idToReplace, newId, idsToRemove }, layout);
  let newPanelsState = changePanelLayout(
    { ...state.persistedState.panels },
    { layout: newLayout || "", trimSavedProps: false }
  );

  const tabs = idsToRemove.map((panelId) => ({ title: getPanelTypeFromId(panelId), layout: panelId }));
  const tabPanelConfig = { id: newId, config: { ...DEFAULT_TAB_PANEL_CONFIG, tabs } };
  const nestedPanelConfigs = getConfigsForNestedPanelsInsideTab(idToReplace, newId, idsToRemove, savedProps);
  newPanelsState = savePanelConfigs(newPanelsState, { configs: [tabPanelConfig, ...nestedPanelConfigs] });

  return {
    ...state,
    mosaic: { ...state.mosaic, selectedPanelIds: [newId] },
    persistedState: { ...state.persistedState, panels: newPanelsState },
  };
};

function importPanelLayout(state: PanelsState, payload: ImportPanelLayoutPayload): PanelsState {
  let migratedPayload = {};
  try {
    migratedPayload = getGlobalHooks().migratePanels(payload);
  } catch (err) {
    return state;
  }

  const newPanelsState = {
    ...migratedPayload,
    layout: migratedPayload.layout || {},
    savedProps: migratedPayload.savedProps || {},
    globalVariables: migratedPayload.globalVariables || {},
    userNodes: migratedPayload.userNodes || {},
    linkedGlobalVariables: migratedPayload.linkedGlobalVariables || [],
    playbackConfig: migratedPayload.playbackConfig || defaultPlaybackConfig,
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

const panelsReducer = function(state: State, action: ActionTypes): State {
  // Make a copy of the persistedState before mutation.
  let newState = { ...state, persistedState: { ...state.persistedState, panels: { ...state.persistedState.panels } } };

  // Any action that changes panels state should potentially trigger a URL update in updateUrlMiddlewareDebounced.
  switch (action.type) {
    case "CHANGE_PANEL_LAYOUT":
      // don't allow the last panel to be removed
      newState.persistedState.panels = changePanelLayout(newState.persistedState.panels, action.payload);
      break;

    case "SAVE_PANEL_CONFIGS":
      newState.persistedState.panels = savePanelConfigs(newState.persistedState.panels, action.payload);
      break;

    case "SAVE_FULL_PANEL_CONFIG":
      newState.persistedState.panels = saveFullPanelConfig(newState.persistedState.panels, action.payload);
      break;

    case "CREATE_TAB_PANEL":
      newState = action.payload.singleTab
        ? createTabPanelWithSingleTab(newState, action.payload)
        : createTabPanelWithMultipleTabs(newState, action.payload);
      break;

    case "IMPORT_PANEL_LAYOUT":
      newState.persistedState.panels = importPanelLayout(newState.persistedState.panels, action.payload);
      break;

    case "OVERWRITE_GLOBAL_DATA":
      newState.persistedState.panels.globalVariables = action.payload;
      break;

    case "SET_GLOBAL_DATA": {
      const globalVariables = { ...newState.persistedState.panels.globalVariables, ...action.payload };
      Object.keys(globalVariables).forEach((key) => {
        if (globalVariables[key] === undefined) {
          delete globalVariables[key];
        }
      });
      newState.persistedState.panels.globalVariables = globalVariables;
      break;
    }

    case "SET_USER_NODES": {
      const userNodes = { ...newState.persistedState.panels.userNodes, ...action.payload };
      Object.keys(action.payload).forEach((key) => {
        if (userNodes[key] === undefined) {
          delete userNodes[key];
        }
      });
      newState.persistedState.panels.userNodes = userNodes;
      break;
    }

    case "SET_LINKED_GLOBAL_VARIABLES":
      newState.persistedState.panels.linkedGlobalVariables = action.payload;
      break;

    case "SET_PLAYBACK_CONFIG":
      newState.persistedState.panels.playbackConfig = {
        ...newState.persistedState.panels.playbackConfig,
        ...action.payload,
      };
      break;

    case "CLOSE_PANEL":
      newState.persistedState.panels = closePanel(newState.persistedState.panels, action.payload);
      break;

    case "SPLIT_PANEL":
      newState.persistedState.panels = splitPanel(state, action.payload);
      break;

    case "SWAP_PANEL":
      newState.persistedState.panels = swapPanel(state, action.payload);
      break;

    case "MOVE_TAB":
      newState.persistedState.panels = moveTab(newState.persistedState.panels, action.payload);
      break;

    case "ADD_PANEL":
      newState.persistedState.panels = addPanel(newState.persistedState.panels, action.payload);
      break;

    case "DROP_PANEL":
      newState.persistedState.panels = dropPanel(newState.persistedState.panels, action.payload);
      break;

    case "START_DRAG":
      newState.persistedState.panels = startDrag(newState.persistedState.panels, action.payload);
      break;

    case "END_DRAG":
      newState.persistedState.panels = endDrag(newState.persistedState.panels, action.payload);
      break;

    case "SET_FETCHED_LAYOUT":
      newState.persistedState.fetchedLayout = action.payload;
      break;
    case "SET_FETCH_LAYOUT_FAILED":
      // Keep the previous fetched layout data, but set isLoading to false.
      newState.persistedState.fetchedLayout.isLoading = false;
      newState.persistedState.fetchedLayout.error = action.payload;
      break;

    case "LOAD_LAYOUT":
      // Dispatched when loading the page with a layout query param, or when manually selecting a different layout.
      // Do not update URL based on ensuing migration changes.
      // $FlowFixMe - TODO: Refactor ImportPanelLayoutPayload to be superset of PanelsState
      newState.persistedState.panels = importPanelLayout(newState.persistedState.panels, action.payload);
      break;

    case "CLEAR_LAYOUT_URL_REPLACED_BY_DEFAULT":
      newState.persistedState.fetchedLayout.layoutUrlReplacedByDefault = undefined;
      break;

    default:
      break;
  }

  return newState;
};

export default panelsReducer;
