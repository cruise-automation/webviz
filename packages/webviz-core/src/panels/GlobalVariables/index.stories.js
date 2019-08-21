// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import GlobalVariables from "./index";
import { GLOBAL_DATA_KEY, LAYOUT_KEY } from "webviz-core/src/reducers/panels";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { defaultLayout } from "webviz-core/src/util/defaultLayoutConfig";
import Storage from "webviz-core/src/util/Storage";

const exampleVariables = {
  someNum: 5,
  someText: "active",
  someObj: { age: 50 },
  someArrOfNums: [1, 2, 3],
  someArrofText: ["a", "b", "c"],
};
const exampleDataWithLinkedVariables = {
  ...exampleVariables,
  linkedName: "some_name",
  linkedScaleObject: { x: 1, y: 1, z: 1 },
  linkedId: 100,
};

const linkedGlobalVariables = [
  {
    topic: "/other_topic_1",
    markerKeyPath: ["name"],
    name: "linkedName",
  },
  {
    topic: "/some_topic",
    markerKeyPath: ["scale", "some_very_very_long_path"],
    name: "linkedScaleObject",
  },
  {
    topic: "/foo/bar",
    markerKeyPath: ["main_id"],
    name: "linkedId",
  },
  {
    topic: "/foo/bar",
    markerKeyPath: ["other_id"],
    name: "linkedId",
  },
];

function setStorage(globalData) {
  const storage = new Storage();
  storage.set(GLOBAL_DATA_KEY, globalData);
  storage.set(LAYOUT_KEY, defaultLayout);
}

storiesOf("<GlobalVariables>", module)
  .addDecorator(withScreenshot())
  .add("default", () => {
    setStorage(exampleVariables);
    const fixture = {
      topics: [],
      frame: {},
    };

    return (
      <PanelSetup fixture={fixture}>
        <GlobalVariables />
      </PanelSetup>
    );
  })
  .add("with linked variables", () => {
    setStorage(exampleDataWithLinkedVariables);
    const fixture = {
      topics: [],
      frame: {},
      linkedGlobalVariables,
    };

    return (
      <PanelSetup fixture={fixture}>
        <GlobalVariables />
      </PanelSetup>
    );
  })
  .add("unlink a variable with a single link", () => {
    setStorage(exampleDataWithLinkedVariables);
    const fixture = {
      topics: [],
      frame: {},
      linkedGlobalVariables,
    };
    return (
      <PanelSetup
        fixture={fixture}
        onMount={(el) => {
          const btn = el.querySelector("[data-test='unlink-linkedName']");
          if (btn) {
            btn.click();
          }
        }}>
        <GlobalVariables />
      </PanelSetup>
    );
  })
  .add("unlink a variable with multiple links", () => {
    setStorage(exampleDataWithLinkedVariables);
    const fixture = {
      topics: [],
      frame: {},
      linkedGlobalVariables,
    };
    return (
      <PanelSetup
        fixture={fixture}
        onMount={(el) => {
          const btn = el.querySelector("[data-test='unlink-linkedId']");
          if (btn) {
            btn.click();
          }
        }}>
        <GlobalVariables />
      </PanelSetup>
    );
  })
  .add(`after unlinking a variable called "linkedName"`, () => {
    setStorage(exampleDataWithLinkedVariables);
    const fixture = {
      topics: [],
      frame: {},
      linkedGlobalVariables,
    };
    return (
      <PanelSetup
        fixture={fixture}
        onMount={(el) => {
          const btn = el.querySelector("[data-test='unlink-linkedName']");
          if (btn) {
            btn.click();
            setImmediate(() => {
              const unlinkFormBtn = document.querySelector("[data-test='unlink-form'] button");
              if (unlinkFormBtn) {
                unlinkFormBtn.click();
              }
            });
          }
        }}>
        <GlobalVariables />
      </PanelSetup>
    );
  })
  .add(`after clicking "Clear all"`, () => {
    setStorage(exampleDataWithLinkedVariables);
    const fixture = {
      topics: [],
      frame: {},
      linkedGlobalVariables,
    };
    return (
      <PanelSetup
        fixture={fixture}
        onMount={(el) => {
          const btn = el.querySelector("[data-test='clear-all-button']");
          if (btn) {
            btn.click();
          }
        }}>
        <GlobalVariables />
      </PanelSetup>
    );
  });
