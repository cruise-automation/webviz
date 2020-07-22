// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import NodePlayground, { NodePlaygroundSettings } from "webviz-core/src/panels/NodePlayground";
import type { Explorer } from "webviz-core/src/panels/NodePlayground";
import testDocs from "webviz-core/src/panels/NodePlayground/index.test.md";
import Sidebar from "webviz-core/src/panels/NodePlayground/Sidebar";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";

const userNodes = {
  nodeId1: { name: "/webviz_node/node", sourceCode: "const someVariableName = 1;" },
  nodeId2: { name: "/webviz_node/node2", sourceCode: "const anotherVariableName = 2;" },
};

const userNodeRosLib = `
  export declare interface TopicsToMessageDefinition {
    "/my_topic": Messages.std_msgs__ColorRGBA;
  }

  export declare interface Duration {
    sec: number;
    nsec: number;
  }

  export declare interface Time {
    sec: number;
    nsec: number;
  }

  export declare namespace Messages {
    export interface std_msgs__ColorRGBA {
      r: number;
      g: number;
      b: number;
      a: number;
    }
  }

  export declare interface Input<T extends keyof TopicsToMessageDefinition> {
    topic: T;
    receiveTime: Time;
    message: TopicsToMessageDefinition[T];
  }
`;

const fixture = {
  topics: [],
  frame: {},
  userNodeRosLib,
};

const sourceCodeWithLogs = `
  import { Messages } from "ros";

  export const inputs = ["/my_topic"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}";

  const publisher = (): Messages.std_msgs__ColorRGBA => {
    log({ "someKey": { "nestedKey": "nestedValue" } });
    return { r: 1, b: 1, g: 1, a: 1 };
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

const sourceCodeWithUtils = `
  import { Input } from "ros";
  import { norm } from "./pointClouds";

  export const inputs = ["/my_topic"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}/1";

  const publisher = (message: Input<"/my_topic">): { val: number } => {
    const val = norm({x:1, y:2, z:3});
    return { val };
  };

  export default publisher;
`;

const utilsSourceCode = `
  import { type RGBA } from "ros";

  export function norm() {
    return 0;
  }
`;

storiesOf("<NodePlayground>", module)
  .addParameters({
    screenshot: {
      delay: 2500,
    },
  })
  .add("welcome screen", () => {
    return (
      <PanelSetup fixture={fixture}>
        <NodePlayground />
      </PanelSetup>
    );
  })
  .add("utils usage in node", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: {
          nodeId1: {
            name: "/webviz_node/node",
            sourceCode: sourceCodeWithUtils,
          },
        },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
        userNodeLogs: { nodeId1: { logs: [] } },
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("editor goto definition", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: {
          nodeId1: {
            name: "/webviz_node/node",
            sourceCode: sourceCodeWithUtils,
          },
        },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
        userNodeLogs: { nodeId1: { logs: [] } },
      }}>
      <NodePlayground
        config={{
          selectedNodeId: "nodeId1",
          vimMode: false,
          additionalBackStackItems: [
            {
              filePath: "/webviz_node/pointClouds",
              code: utilsSourceCode,
              readOnly: true,
            },
          ],
        }}
      />
    </PanelSetup>
  ))
  .add("go back from goto definition", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: {
          nodeId1: {
            name: "/webviz_node/node",
            sourceCode: sourceCodeWithUtils,
          },
        },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
        userNodeLogs: { nodeId1: { logs: [] } },
      }}
      onMount={(el) => {
        setImmediate(() => {
          el.querySelectorAll("[data-test=go-back]")[0].click();
        });
      }}>
      <NodePlayground
        config={{
          selectedNodeId: "nodeId1",
          vimMode: false,
          additionalBackStackItems: [
            {
              filePath: "/webviz_node/pointClouds",
              code: utilsSourceCode,
              readOnly: true,
            },
          ],
        }}
      />
    </PanelSetup>
  ))
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
  .add("sidebar open - utils explorer - selected utility", () => {
    return (
      <PanelSetup
        fixture={{ ...fixture, userNodes }}
        onMount={(el) => {
          setImmediate(() => {
            el.querySelectorAll("[data-test=utils-explorer]")[0].click();
          });
        }}>
        <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
      </PanelSetup>
    );
  })
  .add("sidebar open - templates explorer", () => {
    return (
      <PanelSetup
        fixture={{ ...fixture, userNodes }}
        onMount={(el) => {
          setImmediate(() => {
            el.querySelectorAll("[data-test=templates-explorer]")[0].click();
          });
        }}>
        <NodePlayground />
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
            userNodeDiagnostics={{}}
            explorer={explorer}
            updateExplorer={updateExplorer}
            selectedNodeId={null}
            userNodes={userNodes}
            deleteNode={() => {}}
            selectNode={() => {}}
            otherMarkdownDocsForTest={testDocs}
            setScriptOverride={() => {}}
            script={null}
            addNewNode={() => {}}
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
  .addParameters({
    screenshot: {
      delay: 2500,
    },
  })
  .add("no errors or logs - closed", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: { nodeId1: { name: "/webviz_node/node", sourceCode: "" } },
        userNodeDiagnostics: { nodeId1: { diagnostics: [] } },
      }}>
      <NodePlayground config={{ selectedNodeId: "nodeId1", vimMode: false }} />
    </PanelSetup>
  ))
  .add("no errors - open", () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userNodes: { nodeId1: { name: "/webviz_node/node", sourceCode: "" } },
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
        userNodes: { nodeId1: { name: "/webviz_node/node", sourceCode: "" } },
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
        userNodes: { nodeId1: { name: "/webviz_node/node", sourceCode: "" } },
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
        userNodes: { nodeId1: { name: "/webviz_node/node", sourceCode: "" } },
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
            name: "/webviz_node/node",
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
            name: "/webviz_node/node",
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
        userNodes: { nodeId1: { name: "/webviz_node/node", sourceCode: "" } },
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
  .addParameters({
    screenshot: {
      delay: 1000,
    },
  })
  .add("enabled vim mode", () => (
    <NodePlaygroundSettings config={{ selectedNodeId: undefined, vimMode: true }} saveConfig={() => {}} />
  ))
  .add("disabled vim mode", () => (
    <NodePlaygroundSettings config={{ selectedNodeId: undefined, vimMode: false }} saveConfig={() => {}} />
  ));
