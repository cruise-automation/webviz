// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { createBrowserHistory } from "history";
import React from "react";
import TestUtils from "react-dom/test-utils";

import Tab from "./index";
import tick from "webviz-core/shared/tick";
import PanelLayout from "webviz-core/src/components/PanelLayout";
import nestedTabLayoutFixture from "webviz-core/src/panels/Tab/nestedTabLayoutFixture.test";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { SExpectedResult } from "webviz-core/src/stories/storyHelpers";
import { dragAndDrop } from "webviz-core/src/test/dragAndDropHelper";

const rootReducer = createRootReducer(createBrowserHistory());

const fixture = { topics: [], datatypes: {}, frame: {}, layout: "Tab!a" };
const manyTabs = new Array(25).fill(1).map((elem, idx) => ({ title: `Tab #${idx + 1}`, layout: null }));
const DEFAULT_TIMEOUT = 200;
storiesOf("<Tab>", module)
  .addParameters({
    screenshot: {
      delay: 1000,
    },
  })
  .add("default", () => (
    <PanelSetup fixture={fixture}>
      <Tab />
    </PanelSetup>
  ))
  .add("showing panel list", () => (
    <PanelSetup
      fixture={fixture}
      onMount={() => {
        setTimeout(async () => {
          await tick();
          document.querySelectorAll('[data-test="pick-a-panel"]')[0].click();
        }, DEFAULT_TIMEOUT);
      }}>
      <Tab />
    </PanelSetup>
  ))
  .add("picking a panel from the panel list creates a new tab if there are none", () => {
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          savedProps: {
            "Tab!a": {
              activeTabIdx: -1,
              tabs: [],
            },
          },
        }}
        onMount={() => {
          setTimeout(async () => {
            await tick();
            document.querySelectorAll('[data-test="pick-a-panel"]')[0].click();
            await tick();
            document.querySelectorAll('[data-test="panel-menu-item Image"]')[0].click();
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
      </PanelSetup>
    );
  })
  .add("picking a panel from the panel list updates the tab's layout", () => {
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          savedProps: {
            "Tab!a": {
              activeTabIdx: 0,
              tabs: [{ title: "First tab", layout: null }],
            },
          },
        }}
        onMount={() => {
          setTimeout(async () => {
            await tick();
            document.querySelectorAll('[data-test="pick-a-panel"]')[0].click();
            await tick();
            document.querySelectorAll('[data-test="panel-menu-item Image"]')[0].click();
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
      </PanelSetup>
    );
  })
  .add("dragging a panel from the panel list updates the tab's layout", () => {
    const store = configureStore(rootReducer);
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          savedProps: {
            "Tab!a": {
              activeTabIdx: 0,
              tabs: [{ title: "First tab", layout: null }],
            },
          },
        }}
        store={store}
        onMount={() => {
          setTimeout(async () => {
            await tick();
            document.querySelectorAll('[data-test="pick-a-panel"]')[0].click();
            await tick();

            const imageItem = document.querySelectorAll('[data-test="panel-menu-item Image"]')[0];
            const panel = document.querySelectorAll('[data-test="empty-drop-target"]')[0];
            dragAndDrop(imageItem, panel);
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
      </PanelSetup>
    );
  })
  .add("dragging a panel from the panel list creates a new tab if there are none", () => {
    const store = configureStore(rootReducer);
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          savedProps: {
            "Tab!a": {
              activeTabIdx: -1,
              tabs: [],
            },
          },
        }}
        store={store}
        onMount={() => {
          setTimeout(async () => {
            await tick();
            document.querySelectorAll('[data-test="pick-a-panel"]')[0].click();
            await tick();

            const imageItem = document.querySelectorAll('[data-test="panel-menu-item Image"]')[0];
            const panel = document.querySelectorAll('[data-test="empty-drop-target"]')[0];
            dragAndDrop(imageItem, panel);
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
      </PanelSetup>
    );
  })
  .add("with chosen active tab", () => (
    <PanelSetup fixture={fixture}>
      <Tab
        config={{
          activeTabIdx: 1,
          tabs: [
            {
              title: "Tab A",
              layout: null,
            },
            {
              title: "Tab B",
              layout: {
                direction: "row",
                first: {
                  direction: "column",
                  first: "3D Panel!2xqjjqw",
                  second: "Publish!81fx2n",
                  splitPercentage: 60,
                },
                second: {
                  direction: "column",
                  first: "ImageViewPanel!3dor2gy",
                  second: "Publish!3wrafzj",
                  splitPercentage: 40,
                },
              },
            },
            {
              title: "Tab C",
              layout: null,
            },
          ],
        }}
      />
    </PanelSetup>
  ))
  .add("many tabs do not cover panel toolbar", () => (
    <PanelSetup
      fixture={fixture}
      onMount={() => {
        const mouseEnterContainer = document.querySelectorAll("[data-test~=panel-mouseenter-container")[0];
        TestUtils.Simulate.mouseEnter(mouseEnterContainer);
      }}>
      <Tab config={{ activeTabIdx: 1, tabs: manyTabs }} />
    </PanelSetup>
  ))
  .add("add tab", () => {
    const store = configureStore(rootReducer);
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          savedProps: {
            "Tab!a": { activeTabIdx: 0, tabs: [{ title: "Tab A", layout: null }] },
          },
        }}
        style={{ width: "100%" }}
        store={store}
        onMount={() => {
          setTimeout(async () => {
            const addTabBtn = document.querySelector("[data-test=add-tab]");
            if (addTabBtn) {
              addTabBtn.click();
            }
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
      </PanelSetup>
    );
  })
  .add("remove tab", () => {
    const store = configureStore(rootReducer);
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          savedProps: {
            "Tab!a": { activeTabIdx: 0, tabs: manyTabs.slice(0, 5) },
          },
        }}
        style={{ width: "100%" }}
        store={store}
        onMount={() => {
          setTimeout(async () => {
            const removeTabBtn = document.querySelector("[data-test=tab-icon]");
            if (removeTabBtn) {
              removeTabBtn.click();
            }
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
      </PanelSetup>
    );
  })
  .add("reorder tabs within Tab panel by dropping on tab", () => {
    const store = configureStore(rootReducer);
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          savedProps: {
            "Tab!a": { activeTabIdx: 0, tabs: manyTabs.slice(0, 5) },
          },
        }}
        style={{ width: "100%" }}
        store={store}
        onMount={() => {
          setTimeout(async () => {
            await tick();
            const tabs = document.querySelectorAll("[draggable=true]");

            // Drag and drop the first tab onto the third tab
            dragAndDrop(tabs[0], tabs[2]);
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
        <SExpectedResult>Expected result: #2, #3, #1, #4, #5</SExpectedResult>
      </PanelSetup>
    );
  })
  .add("reorder tabs within Tab panel by dropping on toolbar", () => {
    const store = configureStore(rootReducer);
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          savedProps: {
            "Tab!a": { activeTabIdx: 0, tabs: manyTabs.slice(0, 2) },
          },
        }}
        style={{ width: "100%" }}
        store={store}
        onMount={() => {
          setTimeout(async () => {
            await tick();
            const tabs = document.querySelectorAll("[draggable=true]");
            const toolbar = document.querySelectorAll('[data-test="toolbar-droppable"]')[0];

            // Drag and drop the first tab onto the toolbar
            dragAndDrop(tabs[0], toolbar);
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
        <SExpectedResult>Expected result: #2, #1 (selected)</SExpectedResult>
      </PanelSetup>
    );
  })
  .add("move tab to different Tab panel", () => {
    const store = configureStore(rootReducer);
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          layout: {
            first: "Tab!a",
            second: "Tab!b",
            direction: "row",
            splitPercentage: 50,
          },
          savedProps: {
            "Tab!a": { activeTabIdx: 0, tabs: manyTabs.slice(0, 2) },
            "Tab!b": { activeTabIdx: 0, tabs: manyTabs.slice(2, 3) },
          },
        }}
        style={{ width: "100%" }}
        store={store}
        onMount={() => {
          setTimeout(async () => {
            await tick();
            const tabs = document.querySelectorAll("[draggable=true]");
            const toolbar = document.querySelectorAll('[data-test="toolbar-droppable"]')[1];

            // Drag and drop the first tab onto the toolbar of the second tab panel
            dragAndDrop(tabs[1], toolbar);
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
        <SExpectedResult css="left: 0">Should have only #2</SExpectedResult>
        <SExpectedResult css="left: 50%">Should have #3 and #1</SExpectedResult>
      </PanelSetup>
    );
  })
  .add("prevent dragging selected parent tab into child tab panel", () => {
    const store = configureStore(rootReducer);
    return (
      <PanelSetup
        fixture={{
          ...fixture,
          savedProps: {
            "Tab!a": { activeTabIdx: 0, tabs: [{ title: "Parent tab", layout: "Tab!b" }, manyTabs[0]] },
            "Tab!b": { activeTabIdx: 0, tabs: manyTabs.slice(3, 6) },
          },
        }}
        style={{ width: "100%" }}
        store={store}
        onMount={() => {
          setTimeout(async () => {
            await tick();
            const tabs = document.querySelectorAll("[draggable=true]");
            const toolbar = document.querySelectorAll('[data-test="toolbar-droppable"]')[0];

            // Drag the first tab in the parent tab panel over the second tab in the child tab panel
            tabs[0].dispatchEvent(new MouseEvent("dragstart", { bubbles: true }));
            tabs[0].dispatchEvent(new MouseEvent("dragenter", { bubbles: true }));
            toolbar.dispatchEvent(new MouseEvent("dragout", { bubbles: true }));
            await tick();
            tabs[2].dispatchEvent(new MouseEvent("dragover", { bubbles: true }));
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
        <SExpectedResult css="left: 0">the first tab should be hidden (we never dropped it)</SExpectedResult>
        <SExpectedResult css="top: 50px">tab content should be hidden</SExpectedResult>
      </PanelSetup>
    );
  })
  .add("dragging and dropping a nested tab panel does not remove any tabs", () => {
    const store = configureStore(rootReducer);
    return (
      <PanelSetup
        fixture={nestedTabLayoutFixture}
        style={{ width: "100%" }}
        store={store}
        onMount={() => {
          setTimeout(async () => {
            // Create a new tab on the left side
            document.querySelectorAll('[data-test~="Tab!Left"] [data-test="add-tab"]')[0].click();

            const dragHandle = document.querySelector('[data-test~="Tab!RightInner"] [data-test="mosaic-drag-handle"]');
            dragAndDrop(dragHandle, () =>
              document.querySelector('[data-test~="Tab!Left"] [data-test="empty-drop-target"]')
            );
          }, DEFAULT_TIMEOUT);
        }}>
        <PanelLayout />
      </PanelSetup>
    );
  });
