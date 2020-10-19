// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { PANELS_ACTION_TYPES } from "webviz-core/src/actions/panels";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { Store } from "webviz-core/src/reducers";
import { setPersistedStateInLocalStorage } from "webviz-core/src/reducers/panels";
import { getShouldProcessPatch } from "webviz-core/src/util/layout";

type Action = { type: string, payload: any };

let updateUrlTimer;

function maybeSetPersistedStateInLocalStorage(store: Store, skipSettingLocalStorage: boolean) {
  if (skipSettingLocalStorage) {
    return;
  }
  const state = store.getState();
  const persistedState = {
    ...state.persistedState,
    // Persist search so we can restore the current layout when loading Webviz without layout params.
    search: state.router.location.search,
  };
  setPersistedStateInLocalStorage(persistedState);
}
const {
  LOAD_LAYOUT,
  IMPORT_PANEL_LAYOUT,
  CHANGE_PANEL_LAYOUT,
  SAVE_PANEL_CONFIGS,
  SAVE_FULL_PANEL_CONFIG,
  CREATE_TAB_PANEL,
  OVERWRITE_GLOBAL_DATA,
  SET_GLOBAL_DATA,
  SET_USER_NODES,
  SET_LINKED_GLOBAL_VARIABLES,
  SET_PLAYBACK_CONFIG,
  CLOSE_PANEL,
  SPLIT_PANEL,
  SWAP_PANEL,
  MOVE_TAB,
  ADD_PANEL,
  DROP_PANEL,
  START_DRAG,
  END_DRAG,
} = PANELS_ACTION_TYPES;

const updateUrlAndLocalStorageMiddlewareDebounced = (store: Store) => (next: (Action) => any) => (action: Action) => {
  const result = next(action); // eslint-disable-line callback-return
  // Any action that changes panels state should potentially trigger a URL update.
  const skipSettingLocalStorage = !!action.payload?.skipSettingLocalStorage;

  if (
    [
      LOAD_LAYOUT,
      IMPORT_PANEL_LAYOUT,
      CHANGE_PANEL_LAYOUT,
      SAVE_PANEL_CONFIGS,
      SAVE_FULL_PANEL_CONFIG,
      CREATE_TAB_PANEL,
      OVERWRITE_GLOBAL_DATA,
      SET_GLOBAL_DATA,
      SET_USER_NODES,
      SET_LINKED_GLOBAL_VARIABLES,
      SET_PLAYBACK_CONFIG,
      CLOSE_PANEL,
      SPLIT_PANEL,
      SWAP_PANEL,
      MOVE_TAB,
      ADD_PANEL,
      DROP_PANEL,
      START_DRAG,
      END_DRAG,
    ].includes(action.type)
  ) {
    if (updateUrlTimer) {
      clearTimeout(updateUrlTimer);
    }
    updateUrlTimer = setTimeout(async () => {
      const shouldProcessPatch = getShouldProcessPatch();
      if (!shouldProcessPatch) {
        maybeSetPersistedStateInLocalStorage(store, skipSettingLocalStorage);
        return result;
      }
      await getGlobalHooks().updateUrlToTrackLayoutChanges({
        store,
        skipPatch: action.type === LOAD_LAYOUT,
      });

      maybeSetPersistedStateInLocalStorage(store, skipSettingLocalStorage);
      return result;
    }, 500);
  }

  maybeSetPersistedStateInLocalStorage(store, skipSettingLocalStorage);
  return result;
};

export default updateUrlAndLocalStorageMiddlewareDebounced;
