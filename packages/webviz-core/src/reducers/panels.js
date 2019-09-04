// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEmpty, pick, cloneDeep } from "lodash";
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

export const GLOBAL_STATE_STORAGE_KEY = "webvizGlobalState";

// TODO(Audrey): remove the storage migration logic and fallback to empty in late 2019
const OLD_KEYS = {
  layout: "panels.layout",
  savedProps: "panels.savedProps",
  globalData: "panels.globalData",
  userNodes: "panels.userNodes",
  linkedGlobalVariables: "panels.linkedGlobalVariables",
};

export function getGlobalStateFromStorage(): any {
  return storage.get(GLOBAL_STATE_STORAGE_KEY);
}
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

export function setStorageStateAndFallbackToDefault(globalState: any = {}) {
  const newGlobalState = { ...globalState };
  const defaultGlobalStates = getGlobalHooks().getDefaultGlobalStates();
  // extra checks to make sure all the common fields are present
  Object.keys(defaultGlobalStates).forEach((fieldName) => {
    const newFieldValue = globalState[fieldName];
    if (isEmpty(newFieldValue)) {
      newGlobalState[fieldName] = defaultGlobalStates[fieldName];
    }
  });

  storage.set(GLOBAL_STATE_STORAGE_KEY, newGlobalState);
  return newGlobalState;
}

function getOldStorageAndRemoveKey() {
  // retrieve state from the old storages and delete those afterwards
  const defaultGlobalStates = getGlobalHooks().getDefaultGlobalStates();
  const newGlobalState = cloneDeep(defaultGlobalStates);
  Object.keys(OLD_KEYS).forEach((fieldName) => {
    const storageKey = OLD_KEYS[fieldName];
    const oldStorage = storage.get(storageKey);
    if (oldStorage) {
      newGlobalState[fieldName] = oldStorage;
      storage.remove(storageKey);
    }
  });

  return newGlobalState;
}
// getDefaultState will be called once when the store initializes this reducer.
// It is a function instead of a const so we can manipulate localStorage in test setup
// and when we create new stores they will use the new values in localStorage
function getDefaultState(): PanelsState {
  let newGlobalState = storage.get(GLOBAL_STATE_STORAGE_KEY);
  if (newGlobalState) {
    // use the new global state storage directly if it's present
    setStorageStateAndFallbackToDefault(newGlobalState);
    // don't use the old storage but simply remove the keys in case both new key and old keys are present
    getOldStorageAndRemoveKey();
  } else {
    newGlobalState = getOldStorageAndRemoveKey();
  }

  return getGlobalHooks().migratePanels(newGlobalState);
}

function changePanelLayout(state: PanelsState, layout: any): PanelsState {
  // filter saved props in case a panel was removed from the layout
  // we don't want it saved props hanging around forever
  const savedProps = pick(state.savedProps, getLeaves(layout));
  return { ...state, savedProps, layout };
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

  return { ...state, savedProps: newProps };
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

function importPanelLayout(state: PanelsState, payload: ImportPanelLayoutPayload): PanelsState {
  let migratedPayload = {};
  try {
    migratedPayload = getGlobalHooks().migratePanels(payload);
  } catch (err) {
    console.error("Error importing layout", payload, err);
    return state;
  }

  const newGlobalState = {
    layout: migratedPayload.layout || {},
    savedProps: migratedPayload.savedProps || {},
    globalData: migratedPayload.globalData || {},
    userNodes: migratedPayload.userNodes || {},
    linkedGlobalVariables: migratedPayload.linkedGlobalVariables || [],
  };

  return newGlobalState;
}

export default function panelsReducer(state: PanelsState = getDefaultState(), action: ActionTypes) {
  let newGlobalState = { ...state };
  switch (action.type) {
    case "CHANGE_PANEL_LAYOUT":
      // don't allow the last panel to be removed
      newGlobalState = changePanelLayout(state, action.layout || state.layout);
      break;

    case "SAVE_PANEL_CONFIG":
      newGlobalState = savePanelConfig(state, action.payload);
      break;

    case "SAVE_FULL_PANEL_CONFIG":
      newGlobalState = saveFullPanelConfig(state, action.payload);
      break;

    case "IMPORT_PANEL_LAYOUT":
      newGlobalState = importPanelLayout(state, action.payload);
      if (action.payload.skipSettingLocalStorage) {
        return newGlobalState;
      }
      break;

    case "OVERWRITE_GLOBAL_DATA":
      newGlobalState.globalData = action.payload;
      break;

    case "SET_GLOBAL_DATA": {
      const globalData = { ...state.globalData, ...action.payload };
      Object.keys(globalData).forEach((key) => {
        if (globalData[key] === undefined) {
          delete globalData[key];
        }
      });
      newGlobalState.globalData = globalData;
      break;
    }

    case "SET_USER_NODES": {
      const userNodes = { ...state.userNodes, ...action.payload };
      Object.keys(action.payload).forEach((key) => {
        if (userNodes[key] === undefined) {
          delete userNodes[key];
        }
      });
      newGlobalState.userNodes = userNodes;
      break;
    }

    case "SET_LINKED_GLOBAL_VARIABLES": {
      newGlobalState.linkedGlobalVariables = action.payload;
      break;
    }

    default:
      break;
  }

  storage.set(GLOBAL_STATE_STORAGE_KEY, newGlobalState);
  return newGlobalState;
}
