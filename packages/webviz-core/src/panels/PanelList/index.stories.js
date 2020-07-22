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
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import TestUtils from "react-dom/test-utils";
import { Provider } from "react-redux";

import PanelList from "webviz-core/src/panels/PanelList";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

storiesOf("<PanelList>", module)
  .addDecorator((childrenRenderFcn) => (
    <DndProvider backend={HTML5Backend}>
      <Provider store={configureStore(createRootReducer(createMemoryHistory()))}>{childrenRenderFcn()}</Provider>
    </DndProvider>
  ))
  .add("panel list", () => (
    <div style={{ margin: 150 }}>
      <PanelList onPanelSelect={() => {}} />
    </div>
  ))
  .add("filtered panel list", () => (
    <div
      style={{ margin: 150 }}
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
      <PanelList onPanelSelect={() => {}} />
    </div>
  ))
  .add("case-insensitive filtering and highlight submenu", () => (
    <div
      style={{ margin: 150 }}
      ref={(el) => {
        if (el) {
          const input: ?HTMLInputElement = (el.querySelector("input"): any);
          if (input) {
            input.focus();
            input.value = "dp";
            TestUtils.Simulate.change(input);
          }
        }
      }}>
      <PanelList onPanelSelect={() => {}} />
    </div>
  ));
