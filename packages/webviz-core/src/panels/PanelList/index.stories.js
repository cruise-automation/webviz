// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { createMemoryHistory } from "history";
import * as React from "react";
import { DragDropContextProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import TestUtils from "react-dom/test-utils";
import { Provider } from "react-redux";
import { withScreenshot } from "storybook-chrome-screenshot";

import PanelList from "webviz-core/src/panels/PanelList";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

storiesOf("<PanelList>", module)
  .addDecorator(withScreenshot())
  .addDecorator((childrenRenderFcn) => (
    <DragDropContextProvider backend={HTML5Backend}>
      <Provider store={configureStore(createRootReducer(createMemoryHistory()))}>{childrenRenderFcn()}</Provider>
    </DragDropContextProvider>
  ))
  .add("panel list", () => (
    <PanelList
      onPanelSelect={() => {}}
      mosaicId=""
      mosaicLayout=""
      changePanelLayout={() => {}}
      savePanelConfig={() => {}}
    />
  ))
  .add("filtered panel list", () => (
    <div
      ref={(el) => {
        if (el) {
          const input: ?HTMLInputElement = (el.querySelector("input"): any);
          if (input) {
            input.focus();
            input.value = "h";
            TestUtils.Simulate.change(input);
          }
        }
      }}>
      <PanelList
        onPanelSelect={() => {}}
        mosaicId=""
        mosaicLayout=""
        changePanelLayout={() => {}}
        savePanelConfig={() => {}}
      />
    </div>
  ));
