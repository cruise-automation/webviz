// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { DragDropContextProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import { Provider } from "react-redux";
import { withScreenshot } from "storybook-chrome-screenshot";

import PanelLayout from "./PanelLayout";
import { changePanelLayout } from "webviz-core/src/actions/panels";
import rootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

storiesOf("<PanelLayout>", module)
  .addDecorator(withScreenshot())
  .add("panel not found", () => {
    const store = configureStore(rootReducer);
    store.dispatch(changePanelLayout("DummyPanelType!4co6n9d"));
    return (
      <Provider store={store}>
        <DragDropContextProvider backend={HTML5Backend}>
          <PanelLayout />
        </DragDropContextProvider>
      </Provider>
    );
  });
