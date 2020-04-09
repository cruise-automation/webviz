// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import TestUtils from "react-dom/test-utils";
import { withScreenshot } from "storybook-chrome-screenshot";

import Tab from "./index";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

// TODO(Esther): Uncomment with Tab panel release
// import { createBrowserHistory } from "history";
// import { Provider } from "react-redux";
// import { changePanelLayout, savePanelConfig } from "webviz-core/src/actions/panels";
// import PanelLayout from "webviz-core/src/components/PanelLayout";
// import createRootReducer from "webviz-core/src/reducers";
// import configureStore from "webviz-core/src/store/configureStore.testing";
// const rootReducer = createRootReducer(createBrowserHistory());

const fixture = { topics: [], datatypes: {}, frame: {} };
const manyTabs = new Array(25).fill(1).map((elem, idx) => ({ title: `Tab #${idx + 1}`, layout: {} }));
storiesOf("<Tab>", module)
  .addDecorator(withScreenshot({ delay: 1000 }))
  .add("default", () => (
    <PanelSetup fixture={fixture}>
      <Tab />
    </PanelSetup>
  ))
  .add("with chosen active tab", () => (
    <PanelSetup fixture={fixture}>
      <Tab
        config={{
          activeTabIdx: 1,
          tabs: [
            {
              title: "Tab A",
              layout: {},
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
                  second: "Plot!3wrafzj",
                  splitPercentage: 40,
                },
              },
            },
            {
              title: "Tab C",
              layout: {},
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
        const mouseEnterContainer = document.querySelectorAll("[data-test=panel-mouseenter-container")[0];
        TestUtils.Simulate.mouseEnter(mouseEnterContainer);
      }}>
      <Tab config={{ activeTabIdx: 1, tabs: manyTabs }} />
    </PanelSetup>
  ));
// TODO(Esther): Uncomment with Tab panel release
// .add("add tab", () => {
//   const store = configureStore(rootReducer);
//   store.dispatch(changePanelLayout(`Tab!a`));
//   store.dispatch(
//     savePanelConfig({
//       id: "Tab!a",
//       config: { activeTabIdx: 0, tabs: [{ title: "Tab A", layout: {} }] },
//       defaultConfig: {},
//     })
//   );

//   return (
//     <Provider store={store}>
//       <PanelSetup fixture={fixture} style={{ width: "100%" }}>
//         <PanelLayout
//           ref={() => {
//             setImmediate(() => {
//               const addTabBtn = document.querySelector("[data-test=add-tab]");
//               if (addTabBtn) {
//                 addTabBtn.click();
//               }
//             });
//           }}
//         />
//       </PanelSetup>
//     </Provider>
//   );
// })
// .add("remove tab", () => {
//   const store = configureStore(rootReducer);
//   store.dispatch(changePanelLayout(`Tab!a`));
//   store.dispatch(
//     savePanelConfig({ id: "Tab!a", config: { activeTabIdx: 0, tabs: manyTabs.slice(0, 5) }, defaultConfig: {} })
//   );

//   return (
//     <Provider store={store}>
//       <PanelSetup fixture={fixture} style={{ width: "100%" }}>
//         <PanelLayout
//           ref={() => {
//             setImmediate(() => {
//               const removeTabBtn = document.querySelector("[data-test=remove-tab]");
//               if (removeTabBtn) {
//                 removeTabBtn.click();
//               }
//             });
//           }}
//         />
//       </PanelSetup>
//     </Provider>
//   );
// });
