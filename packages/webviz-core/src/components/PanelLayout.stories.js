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

import PanelLayout from "./PanelLayout";
import { changePanelLayout } from "webviz-core/src/actions/panels";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

storiesOf("<PanelLayout>", module)
  .add("panel not found", () => {
    const store = configureStore(createRootReducer(createMemoryHistory));
    store.dispatch(changePanelLayout({ layout: "UnknownPanel!4co6n9d" }));
    return (
      <DndProvider backend={HTML5Backend}>
        <PanelSetup fixture={{ topics: [], datatypes: {}, frame: {} }} store={store} omitDragAndDrop>
          <PanelLayout />
        </PanelSetup>
      </DndProvider>
    );
  })
  .add("tab panel", () => {
    const store = configureStore(createRootReducer(createMemoryHistory));
    store.dispatch(
      changePanelLayout({
        layout: {
          first: "Tab!1r7jeml",
          second: "Global!45ehbhx",
          direction: "row",
        },
      })
    );
    return (
      <DndProvider backend={HTML5Backend}>
        <PanelSetup fixture={{ topics: [], datatypes: {}, frame: {} }} store={store} omitDragAndDrop>
          <PanelLayout />
        </PanelSetup>
      </DndProvider>
    );
  });
