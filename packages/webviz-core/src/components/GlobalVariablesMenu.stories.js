// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { createMemoryHistory } from "history";
import React from "react";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import { Provider } from "react-redux";

import GlobalVariablesMenu from "./GlobalVariablesMenu";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

storiesOf("<GlobalVariablesMenu>", module)
  .add("closed", () => {
    return (
      <div style={{ margin: 30, paddingLeft: 300 }}>
        <DndProvider backend={HTML5Backend}>
          <Provider store={configureStore(createRootReducer(createMemoryHistory()))}>
            <GlobalVariablesMenu />
          </Provider>
        </DndProvider>
      </div>
    );
  })
  .add("open", () => {
    return (
      <div style={{ margin: 30, paddingLeft: 300 }}>
        <DndProvider backend={HTML5Backend}>
          <Provider store={configureStore(createRootReducer(createMemoryHistory()))}>
            <GlobalVariablesMenu defaultIsOpen />
          </Provider>
        </DndProvider>
      </div>
    );
  });
