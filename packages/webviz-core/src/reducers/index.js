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
import extensions, { type Extensions as ExtensionsState } from "webviz-core/src/reducers/extensions";
import hoverValue from "webviz-core/src/reducers/hoverValue";
import layoutHistory, { type LayoutHistory, initialLayoutHistoryState } from "webviz-core/src/reducers/layoutHistory";
import mosaic from "webviz-core/src/reducers/mosaic";
import panels, { type PanelsState } from "webviz-core/src/reducers/panels";
import userNodes, { type UserNodeDiagnostics } from "webviz-core/src/reducers/userNodes";
import type { Auth as AuthState } from "webviz-core/src/types/Auth";
import type { HoverValue } from "webviz-core/src/types/hoverValue";

const getReducers = (history: any) => [
  panels,
  mosaic,
  extensions,
  hoverValue,
  userNodes,
  (state) => ({ ...state, router: connectRouter(history)() }),
  layoutHistory,
];

export type State = {
  panels: PanelsState,
  mosaic: { mosaicId: string, selectedPanelIds: string[] },
  auth: AuthState,
  extensions: ExtensionsState,
  hoverValue: ?HoverValue,
  userNodes: { userNodeDiagnostics: UserNodeDiagnostics, rosLib: string },
  router: { location: { pathname: string, search: string } },
  layoutHistory: LayoutHistory,
};

export default function createRootReducer(history: any) {
  const initialState: State = {
    panels: {},
    mosaic: { mosaicId: "", selectedPanelIds: [] },
    auth: Object.freeze({ username: undefined }),
    extensions: Object.freeze({ markerProviders: [], auxiliaryData: {} }),
    hoverValue: null,
    userNodes: { userNodeDiagnostics: {}, rosLib: ros_lib_dts },
    router: connectRouter(history)(),
    layoutHistory: initialLayoutHistoryState,
  };
  return (state: State, action: ActionTypes): State => {
    const oldPanelsState: ?PanelsState = state?.panels;
    const reducers: Array<(State, ActionTypes, ?PanelsState) => State> = (getReducers(history): any);
    return reducers.reduce((builtState, reducer) => reducer(builtState, action, oldPanelsState), {
      ...initialState,
      ...state,
    });
  };
}
