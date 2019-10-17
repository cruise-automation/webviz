// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { createMemoryHistory } from "history";
import React from "react";
import { DragDropContextProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import { Provider } from "react-redux";
import { withScreenshot } from "storybook-chrome-screenshot";

import AppMenu from "webviz-core/src/components/AppMenu";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

storiesOf("<AppMenu>", module)
  .addDecorator(withScreenshot({ delay: 500 }))
  .add("standard", () => {
    return (
      <div style={{ margin: 30, paddingLeft: 300 }}>
        <Provider store={configureStore(createRootReducer(createMemoryHistory()))}>
          <DragDropContextProvider backend={HTML5Backend}>
            <AppMenu defaultIsOpen />
          </DragDropContextProvider>
        </Provider>
      </div>
    );
  });
