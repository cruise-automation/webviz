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
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const ScrolledPanelList = () => {
  return (
    <PanelSetup
      fixture={{ frame: {}, topics: [] }}
      style={{ width: 350 }}
      onMount={() =>
        setImmediate(() => {
          const scrollContainer = document.querySelectorAll(".PanelList__SScrollContainer-hej56s-5")[0];
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        })
      }>
      <div style={{ margin: 50, height: 480 }}>
        <PanelList onPanelSelect={() => {}} />
      </div>
    </PanelSetup>
  );
};
const FilterStory = ({ inputValue }) => (
  <div
    style={{ margin: 50, height: 480 }}
    ref={(el) => {
      if (el) {
        const input: ?HTMLInputElement = (el.querySelector("input"): any);
        if (input) {
          input.focus();
          input.value = inputValue;
          TestUtils.Simulate.change(input);
        }
      }
    }}>
    <PanelList onPanelSelect={() => {}} />
  </div>
);

storiesOf("<PanelList>", module)
  .addDecorator((childrenRenderFcn) => (
    <DndProvider backend={HTML5Backend}>
      <Provider store={configureStore(createRootReducer(createMemoryHistory()))}>{childrenRenderFcn()}</Provider>
    </DndProvider>
  ))
  .add("panel list", () => (
    <div style={{ margin: 50, height: 480 }}>
      <PanelList onPanelSelect={() => {}} />
    </div>
  ))
  .add("scrolled panel list", () => <ScrolledPanelList />)
  .add("filtered panel list", () => <FilterStory inputValue="h" />)
  .add("filtered panel list without results in 1st category", () => <FilterStory inputValue="ha" />)
  .add("filtered panel list without results in any category", () => <FilterStory inputValue="zz" />)
  .add("case-insensitive filtering and highlight submenu", () => <FilterStory inputValue="dp" />);
