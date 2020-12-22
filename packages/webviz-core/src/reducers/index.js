// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { connectRouter } from "connected-react-router";

import type { ActionTypes } from "webviz-core/src/actions";
import { ros_lib_dts } from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/ros";
import commenting from "webviz-core/src/reducers/commenting";
import hoverValue from "webviz-core/src/reducers/hoverValue";
import layoutHistory, { type LayoutHistory, initialLayoutHistoryState } from "webviz-core/src/reducers/layoutHistory";
import mosaic from "webviz-core/src/reducers/mosaic";
import panels, {
  type PanelsState,
  getInitialPersistedStateAndMaybeUpdateLocalStorageAndURL,
} from "webviz-core/src/reducers/panels";
import recentLayouts, { maybeStoreNewRecentLayout } from "webviz-core/src/reducers/recentLayouts";
import tests from "webviz-core/src/reducers/tests";
import userNodes, { type UserNodeDiagnostics } from "webviz-core/src/reducers/userNodes";
import type { Auth as AuthState } from "webviz-core/src/types/Auth";
import type { HoverValue } from "webviz-core/src/types/hoverValue";
import type { SetFetchedLayoutPayload } from "webviz-core/src/types/panels";
import type { Dispatch, GetState } from "webviz-core/src/types/Store";

const getReducers = (history: any) => [
  (state) => ({ ...state, router: connectRouter(history)() }),
  panels,
  mosaic,
  hoverValue,
  userNodes,
  layoutHistory,
  recentLayouts,
  commenting,
  ...(process.env.NODE_ENV === "test" ? [tests] : []),
];

export type PersistedState = {|
  panels: PanelsState,
  fetchedLayout: SetFetchedLayoutPayload,
  search?: string,
|};

export type Dispatcher<T> = (dispatch: Dispatch, getState: GetState) => T;

export type Comment = {
  id: string,
  authorId: string,
  body: string,
  metadata: { [string]: any },
  attachments: { url: string }[],
};
export type State = {
  persistedState: PersistedState,
  mosaic: { mosaicId: string, selectedPanelIds: string[] },
  auth: AuthState,
  hoverValue: ?HoverValue,
  userNodes: { userNodeDiagnostics: UserNodeDiagnostics, rosLib: string },
  router: { location: { pathname: string, search: string } },
  layoutHistory: LayoutHistory,
  commenting: { fetchedCommentsBase: Comment[], fetchedCommentsFeature: Comment[] },
};

export type Store = { dispatch: Dispatch, getState: () => State };

export default function createRootReducer(history: any, args?: { testAuth?: any }) {
  const persistedState = getInitialPersistedStateAndMaybeUpdateLocalStorageAndURL(history);
  maybeStoreNewRecentLayout(persistedState);
  const initialState: State = {
    persistedState,
    mosaic: { mosaicId: "", selectedPanelIds: [] },
    auth: Object.freeze(args?.testAuth || { username: undefined }),
    extensions: Object.freeze({ markerProviders: [], auxiliaryData: {} }),
    hoverValue: null,
    userNodes: { userNodeDiagnostics: {}, rosLib: ros_lib_dts },
    router: connectRouter(history)(),
    layoutHistory: initialLayoutHistoryState,
    commenting: { fetchedCommentsBase: [], fetchedCommentsFeature: [], sourceToShow: "Both" },
  };
  return (state: State, action: ActionTypes): State => {
    const oldPersistedState: ?PersistedState = state?.persistedState;
    const reducers: Array<(State, ActionTypes, ?PersistedState) => State> = (getReducers(history): any);
    return reducers.reduce((builtState, reducer) => reducer(builtState, action, oldPersistedState), {
      ...initialState,
      ...state,
    });
  };
}
