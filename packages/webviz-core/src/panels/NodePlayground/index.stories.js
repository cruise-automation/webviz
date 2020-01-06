// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import { assertionTest } from "stories/assertionTestUtils";
import NodePlayground, { Editor } from "webviz-core/src/panels/NodePlayground";
// import NodePlayground, { NodePlaygroundSettings } from "webviz-core/src/panels/NodePlayground";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
// import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";

const userNodes = {
  nodeId1: { name: "/some/custom/node", sourceCode: "const someVariableName = 1;" },
  nodeId2: { name: "/another/custom/node", sourceCode: "const anotherVariableName = 2;" },
};

const fixture = {
  topics: [],
  frame: {},
};

// const sourceCodeWithLogs = `
// import { Time, Message } from "ros";
// type InputTopicMsg = {header: {stamp: Time}};
// type Marker = {};
// type MarkerArray = { markers: Marker[] }
//
// export const inputs = ["/able_to_engage"];
// export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}";
//
// const publisher = (message: Message<InputTopicMsg>): MarkerArray => {
// log({ "someKey": { "nestedKey": "nestedValue" } });
// return { markers: [] };
// };
//
// log(100, false, "abc", null, undefined);
// export default publisher;
// `;
// const logs = [
// { source: "registerNode", value: 100, lineNum: 1, colNum: 0 },
// { source: "registerNode", value: false, lineNum: 2, colNum: 0 },
// { source: "registerNode", value: "abc", lineNum: 3, colNum: 0 },
// { source: "registerNode", value: null, lineNum: 4, colNum: 0 },
// { source: "registerNode", value: undefined, lineNum: 5, colNum: 0 },
// { source: "processMessage", value: { someKey: { nestedKey: "nestedValue" } }, lineNum: 6, colNum: 0 },
// ];

/* eslint-disable react/display-name */

storiesOf("<NodePlayground>", module)
  .addDecorator(withScreenshot({ delay: 1000 }))
  .add(
    "sidebar open - node explorer - selected node",
    assertionTest({
      story: () => {
        return (
          <PanelSetup
            fixture={{ ...fixture, userNodes }}
            onMount={(el) => {
              setImmediate(() => {
                el.querySelectorAll("[data-test=node-explorer]")[0].click();
              });
            }}>
            <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
          </PanelSetup>
        );
      },
      assertions: async () => {
        await Editor;
      },
    })
  )
  .add(
    "sidebar open - docs explorer",
    assertionTest({
      story: () => {
        return (
          <PanelSetup
            fixture={{ ...fixture, userNodes }}
            onMount={(el) => {
              setImmediate(() => {
                el.querySelectorAll("[data-test=docs-explorer]")[0].click();
              });
            }}>
            <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
          </PanelSetup>
        );
      },
      assertions: async () => {
        await Editor;
      },
    })
  );
