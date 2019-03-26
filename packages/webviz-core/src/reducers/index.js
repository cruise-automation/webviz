// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { routerReducer as routing } from "react-router-redux";
import { combineReducers } from "redux";
import type { Reducer } from "redux";

import auth from "./auth";
import extensions from "./extensions";
import mosaic from "./mosaic";
import panels from "./panels";
import type { Routing } from "webviz-core/src/types/router";

const reducers = {
  routing: (routing: Reducer<Routing, any>),
  panels,
  mosaic,
  auth,
  extensions,
};

const rootReducer = combineReducers<typeof reducers, any>(reducers);
export default rootReducer;

export type Reducers = $Exact<typeof reducers>;
export type State = $ObjMap<Reducers, <F>(_: F) => $Call<F, any, any>>;
