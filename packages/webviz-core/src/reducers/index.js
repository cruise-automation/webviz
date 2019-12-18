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
import mosaic from "./mosaic";
import panels from "./panels";
import userNodes from "./userNodes";

const reducers = {
  panels,
  mosaic,
  auth,
  extensions,
  userNodes,
};

export default function createRootReducer(history: any) {
  return combineReducers<typeof reducers, any>({
    ...reducers,
    router: connectRouter(history),
  });
}

export type Reducers = $Exact<{ ...typeof reducers, router: $Call<connectRouter> }>;
export type State = $ObjMap<Reducers, <F>(_: F) => $Call<F, any, any>>;
