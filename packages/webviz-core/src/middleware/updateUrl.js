// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { replace } from "connected-react-router";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { State } from "webviz-core/src/reducers";
import { getShouldProcessPatch } from "webviz-core/src/util/layout";

type Action = { type: string, payload: any };
type Dispatch = (action: Action) => any;
type ThunkAction = { dispatch: Dispatch, getState: () => State };
let updateUrlTimer;
const updateUrlMiddlewareDebounced = (store: ThunkAction) => (next: (Action) => any) => (action: Action) => {
  // Any action that changes panels state should potentially trigger a URL update.
  if (
    [
      "LOAD_FETCHED_LAYOUT",
      "IMPORT_PANEL_LAYOUT",
      "CHANGE_PANEL_LAYOUT",
      "SAVE_PANEL_CONFIGS",
      "SAVE_FULL_PANEL_CONFIG",
      "CREATE_TAB_PANEL",
      "OVERWRITE_GLOBAL_DATA",
      "SET_GLOBAL_DATA",
      "SET_USER_NODES",
      "SET_LINKED_GLOBAL_VARIABLES",
      "SET_PLAYBACK_CONFIG",
      "CLOSE_PANEL",
      "SPLIT_PANEL",
      "SWAP_PANEL",
      "MOVE_TAB",
      "ADD_PANEL",
      "DROP_PANEL",
      "START_DRAG",
      "END_DRAG",
    ].includes(action.type)
  ) {
    const result = next(action); // eslint-disable-line callback-return

    if (updateUrlTimer) {
      clearTimeout(updateUrlTimer);
    }
    updateUrlTimer = setTimeout(async () => {
      const search = window.location.search;
      const shouldProcessPatch = getShouldProcessPatch();
      if (!shouldProcessPatch) {
        return result;
      }
      const newQueryString = await getGlobalHooks().getUpdatedUrlToTrackLayout({
        search,
        state: store.getState(),
        skipPatch: action.type === "LOAD_FETCHED_LAYOUT",
      });
      store.dispatch(replace(`/${newQueryString}`));
      return result;
    }, 500);
  }
  return next(action);
};

export default updateUrlMiddlewareDebounced;
