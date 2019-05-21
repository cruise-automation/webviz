// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import TestUtils from "react-dom/test-utils";
import { Provider } from "react-redux";
import { withScreenshot } from "storybook-chrome-screenshot";

import { TOPIC_PREFIX_CONFIG_KEY } from "./Panel";
import PanelLayout from "./PanelLayout";
import { changePanelLayout, savePanelConfig } from "webviz-core/src/actions/panels";
import rootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

storiesOf("<Panel>", module)
  .addDecorator(withScreenshot())
  .add("quick actions", () => {
    const store = configureStore(rootReducer);
    store.dispatch(
      changePanelLayout({
        direction: "row",
        first: "NumberOfRenders!a",
        second: "NumberOfRenders!b",
      })
    );

    return (
      <Provider store={store}>
        <PanelSetup fixture={{ topics: [], datatypes: {}, frame: {} }}>
          <PanelLayout
            ref={() => {
              // Show the quick actions overlay
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "`", code: "Backquote", keyCode: 192 }));
              setImmediate(() => {
                const overlays = document.querySelectorAll("[data-panel-overlay]");
                overlays[0].classList.add("hoverForScreenshot");
              });
            }}
          />
        </PanelSetup>
      </Provider>
    );
  })
  .add("fullscreen mode", () => {
    const store = configureStore(rootReducer);
    store.dispatch(
      changePanelLayout({
        direction: "row",
        first: "NumberOfRenders!a",
        second: "NumberOfRenders!b",
      })
    );

    return (
      <Provider store={store}>
        <PanelSetup fixture={{ topics: [], datatypes: {}, frame: {} }}>
          <PanelLayout
            ref={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "`", code: "Backquote", keyCode: 192 }));
              setImmediate(() => {
                const overlays = document.querySelectorAll("[data-panel-overlay]");
                TestUtils.Simulate.click(overlays[0]);
              });
            }}
          />
        </PanelSetup>
      </Provider>
    );
  })
  .add("opens topicPrefix menu on click if canSetTopicPrefix", () => {
    const store = configureStore(rootReducer);
    store.dispatch(
      changePanelLayout({
        direction: "row",
        first: "Audio!a",
        second: "TopicEcho!b",
      })
    );

    return (
      <PanelSetup
        fixture={{ topics: [], datatypes: {}, frame: {} }}
        onMount={(el) => {
          const toggleElements = el.querySelectorAll("[data-test-topic-prefix-toggle]");

          for (const toggleElement of toggleElements) {
            if (toggleElement) {
              toggleElement.style.display = "block";
              toggleElement.click();
            }
          }
        }}>
        <PanelLayout />
      </PanelSetup>
    );
  })
  .add("displays appropriate corresponding topicPrefix icons", () => {
    const store = configureStore(rootReducer);
    store.dispatch(
      changePanelLayout({
        direction: "row",
        first: "Audio!a",
        second: "Audio!b",
      })
    );

    store.dispatch(
      savePanelConfig({
        id: "Audio!b",
        config: { [TOPIC_PREFIX_CONFIG_KEY]: SECOND_BAG_PREFIX },
      })
    );

    return (
      <PanelSetup fixture={{ topics: [], datatypes: {}, frame: {} }}>
        <PanelLayout />
      </PanelSetup>
    );
  });
