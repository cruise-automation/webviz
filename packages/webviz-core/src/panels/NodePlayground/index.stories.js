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

import NodePlayground, { NodePlaygroundSettings } from "webviz-core/src/panels/NodePlayground";
import type { Explorer } from "webviz-core/src/panels/NodePlayground";
import testDocs from "webviz-core/src/panels/NodePlayground/index.test.md";
import Sidebar from "webviz-core/src/panels/NodePlayground/Sidebar";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";

const userNodes = {
  nodeId1: { name: "/some/custom/node", sourceCode: "const someVariableName = 1;" },
  nodeId2: { name: "/another/custom/node", sourceCode: "const anotherVariableName = 2;" },
};

const fixture = {
  topics: [],
  frame: {},
};

const sourceCodeWithLogs = `
  import { Time, Message } from "ros";
  type InputTopicMsg = {header: {stamp: Time}};
  type Marker = {};
  type MarkerArray = { markers: Marker[] }

  export const inputs = ["/able_to_engage"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}";

  const publisher = (message: Message<InputTopicMsg>): MarkerArray => {
    log({ "someKey": { "nestedKey": "nestedValue" } });
    return { markers: [] };
  };

  log(100, false, "abc", null, undefined);
  export default publisher;
`;
const logs = [
  { source: "registerNode", value: 100, lineNum: 1, colNum: 0 },
  { source: "registerNode", value: false, lineNum: 2, colNum: 0 },
  { source: "registerNode", value: "abc", lineNum: 3, colNum: 0 },
  { source: "registerNode", value: null, lineNum: 4, colNum: 0 },
  { source: "registerNode", value: undefined, lineNum: 5, colNum: 0 },
  { source: "processMessage", value: { someKey: { nestedKey: "nestedValue" } }, lineNum: 6, colNum: 0 },
];

storiesOf("<NodePlayground>", module)
  .addDecorator(withScreenshot({ delay: 1000 }))
  .add("welcome screen", () => {
    return (
      <PanelSetup fixture={fixture}>
        <NodePlayground />
      </PanelSetup>
    );
  })
  .add("sidebar open - node explorer", () => {
    return (
      <PanelSetup
        fixture={{ ...fixture, userNodes }}
        onMount={(el) => {
          setImmediate(() => {
            el.querySelectorAll("[data-test=node-explorer]")[0].click();
          });
        }}>
        <NodePlayground />
      </PanelSetup>
    );
  })
  .add("sidebar open - node explorer - selected node", () => {
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
  })
  .add("sidebar open - docs explorer", () => {
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
  })
  .add("sidebar - code snippets wrap", () => {
    const Story = () => {
      const [explorer, updateExplorer] = React.useState<Explorer>("docs");
      return (
        <PanelSetup fixture={{ ...fixture, userNodes }}>
          <Sidebar
            needsUserTrust={false}
            nodeDiagnosticsAndLogs={{}}
            explorer={explorer}
            updateExplorer={updateExplorer}
            selectedNodeId={null}
            userNodes={userNodes}
            deleteNode={() => {}}
            selectNode={() => {}}
            otherMarkdownDocsForTest={testDocs}
          />
        </PanelSetup>
      );
    };
    return <Story />;
  })
  .add("editor loading state", () => {
    const NeverLoad = () => {
      throw new Promise(() => {});
    };
    return (
      <PanelSetup fixture={{ ...fixture, userNodes }}>
        <NodePlayground config={{ selectedNodeId: "nodeId1", editorForStorybook: <NeverLoad />, vimMode: false }} />
      </PanelSetup>
    );
  });

storiesOf("NodePlayground - <BottomBar>", module)
  .addDecorator(withScreenshot({ delay: 1000 }))

  .add("no errors or logs - closed", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: { nodeId1: { name: "/some/custom/node", sourceCode: "" } },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("no errors - open", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: { nodeId1: { name: "/some/custom/node", sourceCode: "" } },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
      }}
      onMount={(el) => {
        setImmediate(() => {
          const diagnosticsErrorsLabel = el.querySelector("[data-test=np-errors]");
          if (diagnosticsErrorsLabel) {
            diagnosticsErrorsLabel.click();
          }
        });
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("no logs - open", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: { nodeId1: { name: "/some/custom/node", sourceCode: "" } },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
      }}
      onMount={(el) => {
        setImmediate(() => {
          const logsLabel = el.querySelector("[data-test=np-logs]");
          if (logsLabel) {
            logsLabel.click();
          }
        });
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("errors - closed", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: { nodeId1: { name: "/some/custom/node", sourceCode: "" } },
        userNodeDiagnostics: {
          nodeId1: {
            diagnostics: [
              {
                message: `Type '"bad number"' is not assignable to type 'number[]'.`,
                severity: 8,
                source: "Typescript",
                startLineNumber: 0,
                startColumn: 6,
                endLineNumber: 72,
                endColumn: 20,
                code: 2304,
              },
              {
                message: "This is a warning message (without line or column numbers).",
                severity: 4,
                source: "Source A",
                endLineNumber: 72,
                endColumn: 20,
                code: 2304,
              },
              {
                message: "This is an info message (without line or column numbers).",
                severity: 2,
                source: "Source B",
                code: 2304,
              },
              {
                message: "This is a hint message (without line or column numbers).",
                severity: 1,
                source: "Source C",
                code: 2304,
              },
            ],
          },
        },
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("errors - open", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: { nodeId1: { name: "/some/custom/node", sourceCode: "" } },
        userNodeDiagnostics: {
          nodeId1: {
            diagnostics: [
              {
                message: `Type '"bad number"' is not assignable to type 'number[]'.`,
                severity: 8,
                source: "Typescript",
                startLineNumber: 0,
                startColumn: 6,
                endLineNumber: 72,
                endColumn: 20,
                code: 2304,
              },
              {
                message: "This is a warning message (without line or column numbers).",
                severity: 4,
                source: "Source A",
                endLineNumber: 72,
                endColumn: 20,
                code: 2304,
              },
              {
                message: "This is an info message (without line or column numbers).",
                severity: 2,
                source: "Source B",
                code: 2304,
              },
              {
                message: "This is a hint message (without line or column numbers).",
                severity: 1,
                source: "Source C",
                code: 2304,
              },
            ],
          },
        },
      }}
      onMount={(el) => {
        setImmediate(() => {
          const diagnosticsErrorsLabel = el.querySelector("[data-test=np-errors]");
          if (diagnosticsErrorsLabel) {
            diagnosticsErrorsLabel.click();
          }
        });
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("logs - closed", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: {
          nodeId1: {
            name: "/some/custom/node",
            sourceCode: sourceCodeWithLogs,
          },
        },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
        userNodeLogs: { nodeId1: { logs } },
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("logs - open", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: {
          nodeId1: {
            name: "/some/custom/node",
            sourceCode: sourceCodeWithLogs,
          },
        },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
        userNodeLogs: { nodeId1: { logs } },
      }}
      onMount={(el) => {
        setImmediate(() => {
          const logsLabel = el.querySelector("[data-test=np-logs]");
          if (logsLabel) {
            logsLabel.click();
          }
        });
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("cleared logs", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: { nodeId1: { name: "/some/custom/node", sourceCode: "" } },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
        userNodeLogs: { nodeId1: { logs } },
      }}
      onMount={(el) => {
        setImmediate(() => {
          const logsLabel = el.querySelector("[data-test=np-logs]");
          if (logsLabel) {
            logsLabel.click();
            const clearBtn = el.querySelector("button[data-test=np-logs-clear]");
            if (clearBtn) {
              clearBtn.click();
            }
          }
        });
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("security pop up", () => (
    <PanelSetup fixture={{ ...fixture, userNodes, userNodeFlags: { id: "nodeId1", trusted: false } }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ));

storiesOf("<NodePlaygroundSettings>", module)
  .addDecorator(withScreenshot({ delay: 1000 }))
  .add("enabled vim mode", () => (
    <NodePlaygroundSettings config={{ selectedNodeId: undefined, vimMode: true }} saveConfig={() => {}} />
  ))
  .add("disabled vim mode", () => (
    <NodePlaygroundSettings config={{ selectedNodeId: undefined, vimMode: false }} saveConfig={() => {}} />
  ));
