// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import NodePlayground from "webviz-core/src/panels/NodePlayground";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const webvizNodes = {
  "/some/custom/node": "const someVariableName = 1;",
  "/another/custom/node": "const anotherVariableName = 2;",
};
const fixture = {
  topics: [],
  frame: {},
};

storiesOf("<NodePlayground>", module)
  .addDecorator(withScreenshot())
  .add("default", () => {
    return (
      <PanelSetup fixture={fixture}>
        <NodePlayground />
      </PanelSetup>
    );
  })
  .add("sidebar open - Webviz nodes & user-added nodes", () => {
    return (
      <PanelSetup
        fixture={{ ...fixture, webvizNodes }}
        onMount={(el) => {
          setImmediate(() => {
            const toggleElements = el.querySelectorAll("[data-test-node-playground-sidebar]");

            for (const toggleElement of toggleElements) {
              if (toggleElement) {
                toggleElement.click();
              }
            }
          });
        }}>
        <NodePlayground />
      </PanelSetup>
    );
  })
  .add("sidebar open - selected node", () => {
    return (
      <PanelSetup
        fixture={{ ...fixture, webvizNodes }}
        onMount={(el) => {
          setImmediate(() => {
            const toggleElements = el.querySelectorAll("[data-test-node-playground-sidebar]");

            for (const toggleElement of toggleElements) {
              if (toggleElement) {
                toggleElement.click();
              }
            }
          });
        }}>
        <NodePlayground config={{ selectedNode: "/some/custom/node" }} />
      </PanelSetup>
    );
  });
