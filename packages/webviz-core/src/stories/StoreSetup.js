// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";
import React, { useRef, type Node as ReactNode } from "react";
import { Provider } from "react-redux";

import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore";
import type { Store } from "webviz-core/src/types/Store";

type Props = {|
  children: ReactNode,
  store?: Store,
|};

export default function StoreSetup(props: Props) {
  const storeRef = useRef(props.store || configureStore(createRootReducer(createMemoryHistory())));

  return <Provider store={storeRef.current}>{props.children}</Provider>;
}
