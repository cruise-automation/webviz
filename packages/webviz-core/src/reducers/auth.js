// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Auth } from "webviz-core/src/types/Auth";

const initialState: Auth = Object.freeze({
  username: undefined,
});

// boilerplate reducer to hold the auth shape returned from the server or an empty shape if missing
export default function(state: Auth = initialState): Auth {
  return state;
}
