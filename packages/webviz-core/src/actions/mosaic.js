// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export type SET_MOSAIC_ID = { type: "SET_MOSAIC_ID", payload: string };

export type ADD_SELECTED_PANEL_ID = { type: "ADD_SELECTED_PANEL_ID", payload: string };
export type REMOVE_SELECTED_PANEL_ID = { type: "REMOVE_SELECTED_PANEL_ID", payload: string };
export type SET_SELECTED_PANEL_IDS = { type: "SET_SELECTED_PANEL_IDS", payload: string[] };
export type SELECT_ALL_PANELS = { type: "SELECT_ALL_PANELS" };

export const setMosaicId = (payload: string): SET_MOSAIC_ID => ({
  type: "SET_MOSAIC_ID",
  payload,
});

export const addSelectedPanelId = (payload: string): ADD_SELECTED_PANEL_ID => ({
  type: "ADD_SELECTED_PANEL_ID",
  payload,
});

export const removeSelectedPanelId = (payload: string): REMOVE_SELECTED_PANEL_ID => ({
  type: "REMOVE_SELECTED_PANEL_ID",
  payload,
});

export const setSelectedPanelIds = (payload: string[]): SET_SELECTED_PANEL_IDS => ({
  type: "SET_SELECTED_PANEL_IDS",
  payload,
});

export const selectAllPanelIds = (): SELECT_ALL_PANELS => {
  return { type: "SELECT_ALL_PANELS" };
};

export type MosaicActions =
  | SET_MOSAIC_ID
  | ADD_SELECTED_PANEL_ID
  | REMOVE_SELECTED_PANEL_ID
  | SET_SELECTED_PANEL_IDS
  | SELECT_ALL_PANELS;
