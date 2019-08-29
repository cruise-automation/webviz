// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEmpty, pick } from "lodash";
import { getLeaves } from "react-mosaic-component";

import type { ActionTypes } from "webviz-core/src/actions";
import { type GlobalData } from "webviz-core/src/hooks/useGlobalData";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type {
  SaveConfigPayload,
  SaveFullConfigPayload,
  ImportPanelLayoutPayload,
  PanelConfig,
  UserNodes,
} from "webviz-core/src/types/panels";
import { getPanelTypeFromId } from "webviz-core/src/util";
import Storage from "webviz-core/src/util/Storage";

const storage = new Storage();
export const LAYOUT_KEY = "panels.layout";
export const PANEL_PROPS_KEY = "panels.savedProps";
export const GLOBAL_DATA_KEY = "panels.globalData";
export const USER_NODES_KEY = "panels.userNodes";
export const LINKED_GLOBAL_VARIABLES_KEY = "panels.linkedGlobalVariables";

export type PanelsState = {
  layout: any,
  // We store config for each panel in a hash keyed by the panel id.
  // This should at some point be renamed to `config` or `configById` or so,
  // but it's inconvenient to have this diverge from `PANEL_PROPS_KEY`.
  savedProps: { [panelId: string]: PanelConfig },
  globalData: GlobalData,
  userNodes: UserNodes,
  linkedGlobalVariables: LinkedGlobalVariables,
};

function setStorageAndOptionallyFallbackToDefault(data: any, storageKey: string, skipFallback?: boolean) {
  let validData = data;
  if (!skipFallback && isEmpty(validData)) {
    const defaultGlobalStates = getGlobalHooks().getDefaultGlobalStates();
    const fieldName = storageKey.split(".").pop();
    validData = defaultGlobalStates[fieldName];
  }
  storage.set(storageKey, validData);
  return validData;
}

// getDefaultState will be called once when the store initializes this reducer.
// It is a function instead of a const so we can manipulate localStorage in test setup
// and when we create new stores they will use the new values in localStorage
function getDefaultState(): PanelsState {
  // TODO(Audrey): merge all storage into one single object
  const layout = setStorageAndOptionallyFallbackToDefault(storage.get(LAYOUT_KEY), LAYOUT_KEY);
  const savedProps = setStorageAndOptionallyFallbackToDefault(storage.get(PANEL_PROPS_KEY), PANEL_PROPS_KEY);
  const globalData = setStorageAndOptionallyFallbackToDefault(storage.get(GLOBAL_DATA_KEY), GLOBAL_DATA_KEY);
  const userNodes = setStorageAndOptionallyFallbackToDefault(storage.get(USER_NODES_KEY), USER_NODES_KEY);
  const linkedGlobalVariables = setStorageAndOptionallyFallbackToDefault(
    storage.get(LINKED_GLOBAL_VARIABLES_KEY),
    LINKED_GLOBAL_VARIABLES_KEY
  );
  return getGlobalHooks().migratePanels({ layout, savedProps, globalData, userNodes, linkedGlobalVariables });
}

function changePanelLayout(state: PanelsState, layout: any): PanelsState {
  // filter saved props in case a panel was removed from the layout
  // we don't want it saved props hanging around forever
  const savedProps = pick(state.savedProps, getLeaves(layout));
  const { globalData, userNodes, linkedGlobalVariables } = state;
  storage.set(LAYOUT_KEY, layout);
  storage.set(PANEL_PROPS_KEY, savedProps);
  storage.set(GLOBAL_DATA_KEY, globalData);
  storage.set(USER_NODES_KEY, userNodes);
  storage.set(LINKED_GLOBAL_VARIABLES_KEY, linkedGlobalVariables);
  return { ...state, layout, savedProps, globalData, userNodes, linkedGlobalVariables };
}

function savePanelConfig(state: PanelsState, payload: SaveConfigPayload): PanelsState {
  const { id, config } = payload;
  // imutable update of key/value pairs
  const newProps = payload.override
    ? { ...state.savedProps, [id]: config }
    : {
        ...state.savedProps,
        [id]: {
          // merge new config with old one
          // similar to how this.setState merges props
          ...state.savedProps[id],
          ...config,
        },
      };

  // save the new saved panel props in storage
  storage.set(PANEL_PROPS_KEY, newProps);

  return {
    ...state,
    savedProps: newProps,
  };
}

// eslint-disable-next-line no-unused-vars
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

  // save the new saved panel props in storage
  storage.set(PANEL_PROPS_KEY, newProps);

  return {
    ...state,
    savedProps: newProps,
  };
}

function importPanelLayout(state: PanelsState, payload: ImportPanelLayoutPayload): PanelsState {
  let migratedPayload = {};

  try {
    migratedPayload = getGlobalHooks().migratePanels(payload);
  } catch (err) {
    console.error("Error importing layout", payload, err);
    return state;
  }

  let layout = migratedPayload.layout || {};
  let savedProps = migratedPayload.savedProps || {};
  let globalData = migratedPayload.globalData || {};
  let userNodes = migratedPayload.userNodes || {};
  let linkedGlobalVariables = migratedPayload.linkedGlobalVariables || [];

  if (!payload.skipSettingLocalStorage) {
    // skip empty checks since we allow people to dynamically set it to empty
    layout = setStorageAndOptionallyFallbackToDefault(layout, LAYOUT_KEY, true);
    savedProps = setStorageAndOptionallyFallbackToDefault(savedProps, PANEL_PROPS_KEY, true);
    globalData = setStorageAndOptionallyFallbackToDefault(globalData, GLOBAL_DATA_KEY, true);
    userNodes = setStorageAndOptionallyFallbackToDefault(userNodes, USER_NODES_KEY, true);
    linkedGlobalVariables = setStorageAndOptionallyFallbackToDefault(
      linkedGlobalVariables,
      LINKED_GLOBAL_VARIABLES_KEY,
      true
    );
  }

  return {
    ...state,
    layout,
    savedProps,
    globalData,
    userNodes,
    linkedGlobalVariables,
  };
}

export default function panelsReducer(state: PanelsState = getDefaultState(), action: ActionTypes) {
  switch (action.type) {
    case "CHANGE_PANEL_LAYOUT":
      // don't allow the last panel to be removed
      return changePanelLayout(state, action.layout || state.layout);

    case "SAVE_PANEL_CONFIG":
      return savePanelConfig(state, action.payload);

    case "SAVE_FULL_PANEL_CONFIG":
      return saveFullPanelConfig(state, action.payload);

    case "IMPORT_PANEL_LAYOUT":
      return importPanelLayout(state, action.payload);

    case "OVERWRITE_GLOBAL_DATA":
      storage.set(GLOBAL_DATA_KEY, action.payload);
      return { ...state, globalData: action.payload };

    case "SET_GLOBAL_DATA": {
      const globalData = { ...state.globalData, ...action.payload };

      Object.keys(globalData).forEach((key) => {
        if (globalData[key] === undefined) {
          delete globalData[key];
        }
      });

      storage.set(GLOBAL_DATA_KEY, globalData);
      return { ...state, globalData };
    }

    case "SET_USER_NODES": {
      const userNodes = { ...state.userNodes, ...action.payload };

      Object.keys(action.payload).forEach((key) => {
        if (userNodes[key] === undefined) {
          delete userNodes[key];
        }
      });

      storage.set(USER_NODES_KEY, userNodes);
      return { ...state, userNodes };
    }

    case "SET_LINKED_GLOBAL_VARIABLES": {
      storage.set(LINKED_GLOBAL_VARIABLES_KEY, action.payload);
      return { ...state, linkedGlobalVariables: action.payload };
    }

    default:
      return state;
  }
}
