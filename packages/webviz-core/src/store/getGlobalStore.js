// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { routerMiddleware } from "connected-react-router";

import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store";
import history from "webviz-core/src/util/history";

let store;
// We have to wrap the actual creation of the global store in a function so that we only run it
// after Cruise/open-source specific "hooks" have been initialized.
function getGlobalStore() {
  if (!store) {
    store = configureStore(createRootReducer(history), [routerMiddleware(history)]);
  }
  return store;
}

export default getGlobalStore;
