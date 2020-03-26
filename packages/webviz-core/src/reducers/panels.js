// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEmpty, pick, cloneDeep } from "lodash";
import { getLeaves } from "react-mosaic-component";

import type { ActionTypes } from "webviz-core/src/actions";
import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type {
  SaveConfigPayload,
  SaveFullConfigPayload,
  ImportPanelLayoutPayload,
  PanelConfig,
  UserNodes,
  PlaybackConfig,
} from "webviz-core/src/types/panels";
import { getPanelTypeFromId } from "webviz-core/src/util";
import Storage from "webviz-core/src/util/Storage";

const storage = new Storage();

export const GLOBAL_STATE_STORAGE_KEY = "webvizGlobalState";
export const defaultPlaybackConfig = { speed: 0.2 };

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
  layout: any,
  // We store config for each panel in a hash keyed by the panel id.
  // This should at some point be renamed to `config` or `configById` or so,
  // but it's inconvenient to have this diverge from `PANEL_PROPS_KEY`.
  savedProps: { [panelId: string]: PanelConfig },
  globalVariables: GlobalVariables,
  // old state which is migrated to globalVariables. Keeping it here to satisfy flow
  globalData?: GlobalVariables,
  userNodes: UserNodes,
  linkedGlobalVariables: LinkedGlobalVariables,
  playbackConfig: PlaybackConfig,
  restrictedTopics?: string[],
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
  const { id, config, defaultConfig } = payload;
  // imutable update of key/value pairs
  const newProps = payload.override
    ? { ...state.savedProps, [id]: config }
    : {
        ...state.savedProps,
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
    globalVariables: migratedPayload.globalVariables || {},
    userNodes: migratedPayload.userNodes || {},
    linkedGlobalVariables: migratedPayload.linkedGlobalVariables || [],
    playbackConfig: migratedPayload.playbackConfig || defaultPlaybackConfig,
    ...(migratedPayload.restrictedTopics ? { restrictedTopics: migratedPayload.restrictedTopics } : undefined),
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
      break;

    case "OVERWRITE_GLOBAL_DATA":
      newGlobalState.globalVariables = action.payload;
      break;

    case "SET_GLOBAL_DATA": {
      const globalVariables = { ...state.globalVariables, ...action.payload };
      Object.keys(globalVariables).forEach((key) => {
        if (globalVariables[key] === undefined) {
          delete globalVariables[key];
        }
      });
      newGlobalState.globalVariables = globalVariables;
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

    case "SET_PLAYBACK_CONFIG": {
      newGlobalState.playbackConfig = action.payload;
      break;
    }

    default:
      break;
  }

  if (action.payload && action.payload.skipSettingLocalStorage) {
    return newGlobalState;
  }
  storage.set(GLOBAL_STATE_STORAGE_KEY, newGlobalState);
  return newGlobalState;
}
