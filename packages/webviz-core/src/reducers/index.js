// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { connectRouter } from "connected-react-router";
import { combineReducers } from "redux";

import auth from "./auth";
import extensions from "./extensions";
import layoutHistory, { defaultLayoutHistory, type LayoutHistory } from "./layoutHistory";
import mosaic from "./mosaic";
import panels, { type PanelsState } from "./panels";
import userNodes from "./userNodes";
import type { ActionTypes } from "webviz-core/src/actions";

const getReducers = (history: any) => ({
  panels,
  mosaic,
  auth,
  extensions,
  userNodes,
  router: connectRouter(history),
  // Dummy reducers for undo/redo to satisfy combineReducers, which complains if it sees keys it
  // does not expect. We have a separate "real" history reducer for these that can't go through
  // combineReducers because it depends on the state of panels.
  layoutHistory: (state): LayoutHistory => state || defaultLayoutHistory(),
});

export type Reducers = $Exact<$Call<typeof getReducers, any>>;
export type State = $ObjMap<Reducers, <F>(_: F) => $Call<F, any, any>>;

export default function createRootReducer(history: any) {
  const combinedReducers = combineReducers<Reducers, any>(getReducers(history));

  // We wrap combineReducers because the layout history reducer doesn't fit with it: layout history
  // changes require access to two top-level fields (panels and layoutHistory).
  return (state: $Shape<State>, action: ActionTypes): State => {
    const newState = combinedReducers(state, action);

    const oldPanels: ?PanelsState = state && state.panels;
    const newLayoutHistory = layoutHistory(oldPanels, newState.panels, newState.layoutHistory, action);
    return { ...newState, ...newLayoutHistory };
  };
}
