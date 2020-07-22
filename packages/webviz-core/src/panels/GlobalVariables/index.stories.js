// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";

import GlobalVariables from "./index";
import { type LinkedGlobalVariable } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import PanelSetup, { triggerInputChange } from "webviz-core/src/stories/PanelSetup";

const exampleVariables = {
  someNum: 0,
  someText: "active",
  someObj: { age: 50 },
  someArrOfNums: [1, 2, 3],
  someArrOfText: ["a", "b", "c"],
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

function PanelWithData({
  linkedGlobalVariables: linkedGlobalVars = [],
  ...rest
}: {
  linkedGlobalVariables?: LinkedGlobalVariable[],
}) {
  const globalVariables = linkedGlobalVars.length ? exampleDataWithLinkedVariables : exampleVariables;
  const fixture = {
    topics: [],
    frame: {},
    linkedGlobalVariables: linkedGlobalVars,
    globalVariables,
  };

  return (
    <PanelSetup fixture={fixture} {...rest}>
      <GlobalVariables />
    </PanelSetup>
  );
}

storiesOf("<GlobalVariables>", module)
  .add("default", () => {
    return <PanelWithData />;
  })
  .add("click 'Add variable' button", () => {
    return (
      <PanelWithData
        onMount={(el) => {
          const addBtn = el.querySelector("[data-test='add-variable-btn']");
          if (addBtn) {
            addBtn.click();
          }
        }}
      />
    );
  })
  .add("error state: empty variable name", () => {
    return (
      <PanelWithData
        onMount={(el) => {
          const addBtn = el.querySelector("[data-test='add-variable-btn']");
          if (addBtn) {
            addBtn.click();
            setImmediate(() => {
              const firstKeyInput = document.querySelector("[data-test='global-variable-key'] input");
              if (firstKeyInput) {
                triggerInputChange(firstKeyInput, "");
              }
            });
          }
        }}
      />
    );
  })
  .add("error state: variable name collision", () => {
    return (
      <PanelWithData
        onMount={(el) => {
          const addBtn = el.querySelector("[data-test='add-variable-btn']");
          if (addBtn) {
            addBtn.click();
            setImmediate(() => {
              const firstKeyInput = document.querySelector("[data-test='global-variable-key'] input");
              if (firstKeyInput) {
                triggerInputChange(firstKeyInput, "$someText");
              }
            });
          }
        }}
      />
    );
  })
  .add("still show linked variables after clicking 'Clear all' button", () => {
    return (
      <PanelWithData
        linkedGlobalVariables={linkedGlobalVariables}
        onMount={(el) => {
          const clearAllBtn = el.querySelector("[data-test='clear-all-btn']");
          if (clearAllBtn) {
            clearAllBtn.click();
          }
        }}
      />
    );
  })
  .add("edit linked variable value", () => {
    return (
      <PanelWithData
        linkedGlobalVariables={linkedGlobalVariables}
        onMount={() => {
          const allJsonInput = document.querySelectorAll("[data-test='json-input']");
          const lastJsonInput = allJsonInput[allJsonInput.length - 1];
          if (lastJsonInput) {
            triggerInputChange(lastJsonInput, "value is not 100 any more");
          }
        }}
      />
    );
  })
  .add("with linked variables", () => {
    return <PanelWithData linkedGlobalVariables={linkedGlobalVariables} />;
  })
  .add("unlink a variable with a single link", () => {
    return (
      <PanelWithData
        linkedGlobalVariables={linkedGlobalVariables}
        onMount={(el) => {
          const btn = el.querySelector("[data-test='unlink-linkedName']");
          if (btn) {
            btn.click();
          }
        }}
      />
    );
  })
  .add("unlink a variable with multiple links", () => {
    return (
      <PanelWithData
        linkedGlobalVariables={linkedGlobalVariables}
        onMount={(el) => {
          const btn = el.querySelector("[data-test='unlink-linkedId']");
          if (btn) {
            btn.click();
          }
        }}
      />
    );
  })
  .add(`after unlinking a variable called "linkedName"`, () => {
    return (
      <PanelWithData
        linkedGlobalVariables={linkedGlobalVariables}
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
        }}
      />
    );
  });
