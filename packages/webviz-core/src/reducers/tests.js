// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ActionTypes } from "webviz-core/src/actions";
import type { State } from "webviz-core/src/reducers";

export default function testsReducer(state: State, action: ActionTypes): State {
  switch (action.type) {
    case "TEST_SET_PERSISTED_STATE":
      return { ...state, persistedState: action.payload };
    case "TEST_SET_AUTH_STATE":
      return { ...state, auth: action.payload };
    default:
      return state;
  }
}
