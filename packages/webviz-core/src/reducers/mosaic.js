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
  switch (action.type) {
    case "SET_MOSAIC_ID":
      return { ...state, mosaic: { ...state.mosaic, mosaicId: action.payload } };
    case "ADD_SELECTED_PANEL_ID":
      return {
        ...state,
        mosaic: {
          ...state.mosaic,
          selectedPanelIds: uniq<string>([...state.mosaic.selectedPanelIds, action.payload]),
        },
      };
    case "REMOVE_SELECTED_PANEL_ID":
      return {
        ...state,
        mosaic: {
          ...state.mosaic,
          selectedPanelIds: state.mosaic.selectedPanelIds.filter((id) => id !== action.payload),
        },
      };
    case "SET_SELECTED_PANEL_IDS":
      return { ...state, mosaic: { ...state.mosaic, selectedPanelIds: action.payload } };
    case "SELECT_ALL_PANELS":
      return { ...state, mosaic: { ...state.mosaic, selectedPanelIds: getLeaves(state.persistedState.panels.layout) } };
    default:
      return { ...state, mosaic: state.mosaic };
  }
}
