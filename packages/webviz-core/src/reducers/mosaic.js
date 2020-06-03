// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { uniq } from "lodash";
import { getLeaves } from "react-mosaic-component";

import type { ActionTypes } from "webviz-core/src/actions";
import type { State } from "webviz-core/src/reducers";

export default function mosaicReducer(state: State, action: ActionTypes): State {
  const newMosaicState = { ...state.mosaic };
  switch (action.type) {
    case "SET_MOSAIC_ID":
      return { ...state, mosaic: { ...newMosaicState, mosaicId: action.payload } };
    case "ADD_SELECTED_PANEL_ID":
      return {
        ...state,
        mosaic: {
          ...newMosaicState,
          selectedPanelIds: uniq<string>([...newMosaicState.selectedPanelIds, action.payload]),
        },
      };
    case "REMOVE_SELECTED_PANEL_ID":
      return {
        ...state,
        mosaic: {
          ...newMosaicState,
          selectedPanelIds: newMosaicState.selectedPanelIds.filter((id) => id !== action.payload),
        },
      };
    case "SET_SELECTED_PANEL_IDS":
      return { ...state, mosaic: { ...newMosaicState, selectedPanelIds: action.payload } };
    case "SELECT_ALL_PANELS":
      return { ...state, mosaic: { ...newMosaicState, selectedPanelIds: getLeaves(state.panels.layout) } };
    default:
      return { ...state, mosaic: newMosaicState };
  }
}
