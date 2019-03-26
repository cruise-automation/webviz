// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { routerMiddleware, LOCATION_CHANGE } from "react-router-redux";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";

import type { State } from "webviz-core/src/reducers";

const configureStore = (reducer: () => any, middleware?: Array<any> = [], history: any, preloadedState?: State) => {
  const store = createStore<*, *, *>(
    reducer,
    preloadedState,
    applyMiddleware(thunk, routerMiddleware(history), ...middleware)
  );

  // if there is no history, initialize the router state
  // to a blank history entry so tests relying on it being present don't break
  if (history === undefined) {
    store.dispatch({
      type: LOCATION_CHANGE,
      payload: {
        pathname: "",
        search: "",
      },
    });
    return store;
  }

  // if there is a history, connect it to the store
  // we need to wire this manually here
  // ConnectedRouter wires it in an actual app
  const updateHistoryInStore = () => {
    const type = LOCATION_CHANGE;
    const action = {
      type,
      payload: history.location,
    };
    store.dispatch(action);
  };

  history.listen(updateHistoryInStore);

  // push the initial history state into the store
  updateHistoryInStore();

  return store;
};

export default configureStore;
