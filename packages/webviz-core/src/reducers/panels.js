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
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { SaveConfigPayload, ImportPanelLayoutPayload, PanelConfig } from "webviz-core/src/types/panels";
import { getPanelIdForType } from "webviz-core/src/util";
import Storage from "webviz-core/src/util/Storage";

const storage = new Storage();
export const LAYOUT_KEY = "panels.layout";
export const PANEL_PROPS_KEY = "panels.savedProps";
export const GLOBAL_DATA_KEY = "panels.globalData";

export type PanelsState = {
  layout: any,
  // We store config for each panel in a hash keyed by the panel id.
  // This should at some point be renamed to `config` or `configById` or so,
  // but it's inconvenient to have this diverge from `PANEL_PROPS_KEY`.
  savedProps: { [panelId: string]: PanelConfig },
  globalData: Object,
};

// getDefaultState will be called once when the store initializes this reducer.
// It is a function instead of a const so we can manipulate localStorage in test setup
// and when we create new stores they will use the new values in localStorage
function getDefaultState() {
  const result = {
    layout: storage.get(LAYOUT_KEY),
    // by default we don't save props for any of the panels
    savedProps: storage.get(PANEL_PROPS_KEY) || {},
    globalData: storage.get(GLOBAL_DATA_KEY) || {},
  };
  // if there was no previously saved layout
  // save this initial panel layout into local storage
  const layoutIsEmptyObj = typeof result.layout === "object" && isEmpty(result.layout);
  if (!result.layout || layoutIsEmptyObj) {
    const layout = getPanelIdForType("RosOut");
    storage.set(LAYOUT_KEY, layout);
    result.layout = layout;
  }
  return getGlobalHooks().migratePanels(result);
}

function changePanelLayout(state: PanelsState, layout: any): PanelsState {
  // filter saved props incase a panel was removed from the layout
  // we don't want it saved props hanging around forever
  const savedProps = pick(state.savedProps, getLeaves(layout));
  const globalData = state.globalData;
  storage.set(LAYOUT_KEY, layout);
  storage.set(PANEL_PROPS_KEY, savedProps);
  storage.set(GLOBAL_DATA_KEY, globalData);
  return { ...state, layout, savedProps, globalData };
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

function importPanelLayout(state: PanelsState, payload: ImportPanelLayoutPayload) {
  let migratedPayload = getGlobalHooks().migratePanels(payload);

  if (!payload.skipSettingLocalStorage) {
    if (isEmpty(migratedPayload)) {
      storage.set(LAYOUT_KEY, migratedPayload);
      migratedPayload = getDefaultState();
    }
    storage.set(LAYOUT_KEY, migratedPayload.layout);
    storage.set(PANEL_PROPS_KEY, migratedPayload.savedProps);
    storage.set(GLOBAL_DATA_KEY, migratedPayload.globalData || {});
  }
  return {
    ...state,
    ...migratedPayload,
    globalData: migratedPayload.globalData || {},
  };
}

export default function panelsReducer(state: PanelsState = getDefaultState(), action: ActionTypes) {
  switch (action.type) {
    case "CHANGE_PANEL_LAYOUT":
      // don't allow the last panel to be removed
      return changePanelLayout(state, action.layout || state.layout);

    case "SAVE_PANEL_CONFIG":
      return savePanelConfig(state, action.payload);

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

    default:
      return state;
  }
}
