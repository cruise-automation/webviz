// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ActionTypes } from "webviz-core/src/actions";
import { panelEditingActions } from "webviz-core/src/actions/panels";
import type { State, PersistedState } from "webviz-core/src/reducers";
import Storage from "webviz-core/src/util/Storage";

const storage = new Storage();
const LOCALSTORAGE_KEY = "recentLayouts";
const LAYOUT_COUNT_STORED = 10;

// We ONLY save the name, and not the version here, because if the user selects a layout, we just want the most recent
// version of that layout.
type RecentLayoutId = string;
function recentLayoutFromPersistedState(state: PersistedState): ?RecentLayoutId {
  return state.fetchedLayout?.data?.name;
}

// We ALWAYS read from localStorage here, because multiple tabs could be writing to recent layouts.
// Note that changes to recent layouts will not force a re-render.
export function getRecentLayouts(): RecentLayoutId[] {
  return storage.getItem(LOCALSTORAGE_KEY) || [];
}

export function maybeStoreNewRecentLayout(newPersistedState: PersistedState) {
  const oldRecentLayouts = getRecentLayouts();
  const newestRecentLayout = recentLayoutFromPersistedState(newPersistedState);
  if (newestRecentLayout == null || oldRecentLayouts[0] === newestRecentLayout) {
    return;
  }

  const newRecentLayouts = [
    newestRecentLayout,
    ...oldRecentLayouts.filter((layout) => layout !== newestRecentLayout),
  ].slice(0, LAYOUT_COUNT_STORED);
  storage.setItem(LOCALSTORAGE_KEY, newRecentLayouts);
}

export default function(state: State, action: ActionTypes): State {
  if (panelEditingActions.has(action.type)) {
    maybeStoreNewRecentLayout(state.persistedState);
  }
  return { ...state };
}
