// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { PersistedState, Dispatcher } from "webviz-core/src/reducers";
import type { Auth as AuthState } from "webviz-core/src/types/Auth";

export type TEST_SET_PERSISTED_STATE = { type: "TEST_SET_PERSISTED_STATE", payload: PersistedState };
export type TEST_SET_AUTH_STATE = { type: "TEST_SET_AUTH_STATE", payload: AuthState };

export const TEST_ACTION_TYPES = {
  TEST_SET_PERSISTED_STATE: "TEST_SET_PERSISTED_STATE",
  TEST_SET_AUTH_STATE: "TEST_SET_AUTH_STATE",
};

export const testOverwritePersistedState = (payload: PersistedState): Dispatcher<TEST_SET_PERSISTED_STATE> => (
  dispatch
) => {
  return dispatch({ type: TEST_ACTION_TYPES.TEST_SET_PERSISTED_STATE, payload });
};

export const testOverwriteAuthState = (payload: AuthState): Dispatcher<TEST_SET_PERSISTED_STATE> => (dispatch) => {
  return dispatch({ type: TEST_ACTION_TYPES.TEST_SET_AUTH_STATE, payload });
};

export type TestsActions = TEST_SET_PERSISTED_STATE | TEST_SET_AUTH_STATE;
