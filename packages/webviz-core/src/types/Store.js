// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Store as ReduxStore } from "redux";

import type { ActionTypes } from "../actions";
import type { State } from "../reducers";

export type Store = ReduxStore<State, void>;
export type GetState = () => State;

export type Dispatch = (ActionTypes | ((Dispatch, GetState) => any)) => any;
