// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { uniq } from "lodash";

import type { ActionTypes } from "webviz-core/src/actions";

type MosaicState = { mosaicId: string, selectedPanelIds: string[] };
const initialState: MosaicState = { mosaicId: "", selectedPanelIds: [] };

export default function mosaicReducer(state: MosaicState = initialState, action: ActionTypes) {
  switch (action.type) {
    case "SET_MOSAIC_ID":
      return { ...state, mosaicId: action.payload };
    case "ADD_SELECTED_PANEL_ID":
      return { ...state, selectedPanelIds: uniq<string>([...state.selectedPanelIds, action.payload]) };
    case "REMOVE_SELECTED_PANEL_ID":
      return { ...state, selectedPanelIds: state.selectedPanelIds.filter((id) => id !== action.payload) };
    case "SET_SELECTED_PANEL_IDS":
      return { ...state, selectedPanelIds: action.payload };
    default:
      return state;
  }
}
