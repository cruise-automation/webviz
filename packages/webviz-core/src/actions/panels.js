// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { push } from "react-router-redux";

import type { ImportPanelLayoutPayload, SaveConfigPayload } from "webviz-core/src/types/panels";
import type { Dispatch, GetState } from "webviz-core/src/types/Store";

// DANGER: if you change this you break existing layout urls
export const URL_KEY = "layout";

export type SAVE_PANEL_CONFIG = {
  type: "SAVE_PANEL_CONFIG",
  payload: SaveConfigPayload,
};

export type Dispatcher<T> = (dispatch: Dispatch, getState: GetState) => T;

function maybeStripLayoutId(dispatch: Dispatch, getState: GetState): void {
  const state = getState();
  const { location } = state.routing;

  if (location) {
    const params = new URLSearchParams(location.search);
    if (params.get(URL_KEY)) {
      params.delete(URL_KEY);
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
    type: "SAVE_PANEL_CONFIG",
    payload,
  });
};

export type IMPORT_PANEL_LAYOUT = {
  type: "IMPORT_PANEL_LAYOUT",
  payload: ImportPanelLayoutPayload,
};

export const importPanelLayout = (
  payload: ImportPanelLayoutPayload,
  isFromUrl: boolean
): Dispatcher<IMPORT_PANEL_LAYOUT> => (dispatch, getState) => {
  if (!isFromUrl) {
    maybeStripLayoutId(dispatch, getState);
  }
  return dispatch({
    type: "IMPORT_PANEL_LAYOUT",
    payload,
  });
};

export type CHANGE_PANEL_LAYOUT = {
  type: "CHANGE_PANEL_LAYOUT",
  layout: any,
};

export const changePanelLayout = (layout: any): Dispatcher<CHANGE_PANEL_LAYOUT> => (dispatch, getState) => {
  maybeStripLayoutId(dispatch, getState);
  return dispatch({
    type: "CHANGE_PANEL_LAYOUT",
    layout,
  });
};
