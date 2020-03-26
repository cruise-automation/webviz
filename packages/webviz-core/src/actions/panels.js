// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { push } from "connected-react-router";

import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import type {
  ImportPanelLayoutPayload,
  SaveConfigPayload,
  SaveFullConfigPayload,
  UserNodes,
  PlaybackConfig,
} from "webviz-core/src/types/panels";
import type { Dispatch, GetState } from "webviz-core/src/types/Store";
import { LAYOUT_QUERY_KEY } from "webviz-core/src/util/globalConstants";

const PANELS_ACTION_TYPES = {
  CHANGE_PANEL_LAYOUT: "CHANGE_PANEL_LAYOUT",
  IMPORT_PANEL_LAYOUT: "IMPORT_PANEL_LAYOUT",
  SAVE_PANEL_CONFIG: "SAVE_PANEL_CONFIG",
  SAVE_FULL_PANEL_CONFIG: "SAVE_FULL_PANEL_CONFIG",
  OVERWRITE_GLOBAL_DATA: "OVERWRITE_GLOBAL_DATA",
  SET_GLOBAL_DATA: "SET_GLOBAL_DATA",
  SET_USER_NODES: "SET_USER_NODES",
  SET_LINKED_GLOBAL_VARIABLES: "SET_LINKED_GLOBAL_VARIABLES",
  SET_PLAYBACK_CONFIG: "SET_PLAYBACK_CONFIG",
};

export type SAVE_PANEL_CONFIG = {
  type: "SAVE_PANEL_CONFIG",
  payload: SaveConfigPayload,
};
export type SAVE_FULL_PANEL_CONFIG = {
  type: "SAVE_FULL_PANEL_CONFIG",
  payload: SaveFullConfigPayload,
};

export type Dispatcher<T> = (dispatch: Dispatch, getState: GetState) => T;

function maybeStripLayoutId(dispatch: Dispatch, getState: GetState): void {
  const state = getState();
  const { location } = state.router;

  if (location) {
    const params = new URLSearchParams(location.search);
    if (params.get(LAYOUT_QUERY_KEY)) {
      params.delete(LAYOUT_QUERY_KEY);
      const newSearch = params.toString();
      const searchString = newSearch ? `?${newSearch}` : newSearch;
      const newPath = `${location.pathname}${searchString}`;
      dispatch(push(newPath));
    }
  }
}

export const savePanelConfig = (payload: SaveConfigPayload): Dispatcher<SAVE_PANEL_CONFIG> => (dispatch, getState) => {
  if (!payload.silent) {
    maybeStripLayoutId(dispatch, getState);
  }
  return dispatch({
    type: PANELS_ACTION_TYPES.SAVE_PANEL_CONFIG,
    payload,
  });
};

export const saveFullPanelConfig = (payload: SaveFullConfigPayload): Dispatcher<SAVE_FULL_PANEL_CONFIG> => (
  dispatch,
  getState
) => {
  return dispatch({
    type: PANELS_ACTION_TYPES.SAVE_FULL_PANEL_CONFIG,
    payload,
  });
};

type IMPORT_PANEL_LAYOUT = {
  type: "IMPORT_PANEL_LAYOUT",
  payload: ImportPanelLayoutPayload,
};

export const importPanelLayout = (
  payload: ImportPanelLayoutPayload,
  {
    isFromUrl = false,
    skipSettingLocalStorage = false,
  }: { isFromUrl?: boolean, skipSettingLocalStorage?: boolean } = {}
): Dispatcher<IMPORT_PANEL_LAYOUT> => (dispatch, getState) => {
  if (!isFromUrl) {
    maybeStripLayoutId(dispatch, getState);
  }
  return dispatch({
    type: PANELS_ACTION_TYPES.IMPORT_PANEL_LAYOUT,
    payload: skipSettingLocalStorage ? { ...payload, skipSettingLocalStorage } : payload,
  });
};

export type CHANGE_PANEL_LAYOUT = {
  type: "CHANGE_PANEL_LAYOUT",
  layout: any,
};

export const changePanelLayout = (layout: any): Dispatcher<CHANGE_PANEL_LAYOUT> => (dispatch, getState) => {
  maybeStripLayoutId(dispatch, getState);
  return dispatch({
    type: PANELS_ACTION_TYPES.CHANGE_PANEL_LAYOUT,
    layout,
  });
};

type OVERWRITE_GLOBAL_DATA = {
  type: "OVERWRITE_GLOBAL_DATA",
  payload: any,
};

export const overwriteGlobalVariables = (payload: any): OVERWRITE_GLOBAL_DATA => ({
  type: PANELS_ACTION_TYPES.OVERWRITE_GLOBAL_DATA,
  payload,
});

type SET_GLOBAL_DATA = {
  type: "SET_GLOBAL_DATA",
  payload: any,
};

export const setGlobalVariables = (payload: any): SET_GLOBAL_DATA => ({
  type: PANELS_ACTION_TYPES.SET_GLOBAL_DATA,
  payload,
});

type SET_WEBVIZ_NODES = {
  type: "SET_USER_NODES",
  payload: UserNodes,
};

export const setUserNodes = (payload: UserNodes): SET_WEBVIZ_NODES => ({
  type: PANELS_ACTION_TYPES.SET_USER_NODES,
  payload,
});

type SET_LINKED_GLOBAL_VARIABLES = {
  type: "SET_LINKED_GLOBAL_VARIABLES",
  payload: LinkedGlobalVariables,
};

export const setLinkedGlobalVariables = (payload: LinkedGlobalVariables): SET_LINKED_GLOBAL_VARIABLES => ({
  type: PANELS_ACTION_TYPES.SET_LINKED_GLOBAL_VARIABLES,
  payload,
});

type SET_PLAYBACK_CONFIG = {
  type: "SET_PLAYBACK_CONFIG",
  payload: PlaybackConfig,
};

export const setPlaybackConfig = (payload: PlaybackConfig): SET_PLAYBACK_CONFIG => ({
  type: PANELS_ACTION_TYPES.SET_PLAYBACK_CONFIG,
  payload,
});

export type PanelsActions =
  | CHANGE_PANEL_LAYOUT
  | IMPORT_PANEL_LAYOUT
  | SAVE_PANEL_CONFIG
  | SAVE_FULL_PANEL_CONFIG
  | OVERWRITE_GLOBAL_DATA
  | SET_GLOBAL_DATA
  | SET_WEBVIZ_NODES
  | SET_LINKED_GLOBAL_VARIABLES
  | SET_PLAYBACK_CONFIG;

type PanelsActionTypes = $Values<typeof PANELS_ACTION_TYPES>;
export const panelEditingActions = new Set<PanelsActionTypes>(Object.keys(PANELS_ACTION_TYPES));
