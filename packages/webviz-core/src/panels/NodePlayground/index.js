// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import Dimensions from "react-container-dimensions";
import { hot } from "react-hot-loader/root";
import MonacoEditor from "react-monaco-editor";
import { useSelector, useDispatch } from "react-redux";

import helpContent from "./index.help.md";
import { setUserNodes as setUserNodesAction } from "webviz-core/src/actions/panels";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import Sidebar from "webviz-core/src/panels/NodePlayground/Sidebar";
import vsWebvizTheme from "webviz-core/src/panels/NodePlayground/theme/vs-webviz.json";
import { type UserNodes } from "webviz-core/src/types/panels";
import { colors } from "webviz-core/src/util/colors";
import { DEFAULT_WEBVIZ_NODE_NAME } from "webviz-core/src/util/globalConstants";

type Config = {|
  selectedNodeName: ?string,
|};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};

const VS_WEBVIZ_THEME = "vs-webviz";

/*
TODO:
  - more testing on user navigation
*/
function NodePlayground(props: Props) {
  const { config, saveConfig } = props;
  const { selectedNodeName } = config;

  const userNodes = useSelector((state) => state.panels.userNodes);
  const nodeDiagnostics = useSelector((state) => state.nodeDiagnostics);
  const dispatch = useDispatch();
  const setUserNodes = React.useCallback((payload: UserNodes) => dispatch(setUserNodesAction(payload)), [dispatch]);

  // Holds the not yet saved source code.
  const selectedNodeDiagnostics =
    selectedNodeName && nodeDiagnostics[selectedNodeName] ? nodeDiagnostics[selectedNodeName] : { diagnostics: [] };
  const selectedNode = selectedNodeName ? userNodes[selectedNodeName] : "";
  const [stagedScript, setStagedScript] = React.useState(selectedNode);
  const isNodeSaved = stagedScript === selectedNode;
  const { diagnostics } = selectedNodeDiagnostics;

  React.useLayoutEffect(
    () => {
      setStagedScript(selectedNode);
    },
    [selectedNode]
  );

  return (
    <Flex col>
      <PanelToolbar helpContent={helpContent} floating />
      <Flex style={{ height: "100%" }}>
        <Sidebar
          onSelect={(nodeName) => {
            // Save current state so that user can seamlessly go back to previous work.
            setUserNodes({ [selectedNodeName || DEFAULT_WEBVIZ_NODE_NAME]: stagedScript });
            saveConfig({ selectedNodeName: nodeName });
          }}
          onUpdate={(name, value) => {
            setUserNodes({ [name]: value });
            // If value is undefined, that means we deleted the node.
            const nodeName = typeof value === "string" ? name : "";
            saveConfig({ selectedNodeName: nodeName });
          }}
          selectedNodeName={selectedNodeName}
          userNodes={userNodes}
        />
        <Flex col>
          <Flex start>
            <div style={{ padding: 10, paddingLeft: 50 }}>Currently editing:</div>
            <input
              type="text"
              placeholder="Selected node name"
              value={selectedNodeName || DEFAULT_WEBVIZ_NODE_NAME}
              onChange={(e) => {
                const newNodeName = e.target.value;
                setUserNodes({ ...userNodes, [selectedNodeName]: undefined, [newNodeName]: selectedNode });
                saveConfig({ selectedNodeName: newNodeName });
              }}
            />
            <Button
              primary={isNodeSaved}
              danger={!isNodeSaved}
              disabled={isNodeSaved}
              onClick={() => {
                setUserNodes({ [selectedNodeName || DEFAULT_WEBVIZ_NODE_NAME]: stagedScript });
              }}>
              {isNodeSaved ? "Saved" : "Not Saved"}
            </Button>
          </Flex>
          <Dimensions>
            {({ width, height }) => (
              <MonacoEditor
                key={`${width}-${height}`}
                language="typescript"
                theme={VS_WEBVIZ_THEME}
                editorWillMount={(monaco) => {
                  monaco.editor.defineTheme(VS_WEBVIZ_THEME, vsWebvizTheme);
                }}
                options={{
                  minimap: {
                    enabled: false,
                  },
                }}
                value={stagedScript}
                onChange={(script: string) => {
                  setStagedScript(script);
                }}
              />
            )}
          </Dimensions>
          <Flex style={{ position: "absolute", bottom: 0, padding: 5, backgroundColor: colors.RED }}>
            <ul>
              {diagnostics.map(({ message }) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}

NodePlayground.panelType = "NodePlayground";
// TODO: There should NOT be a default selected node name. Force user to choose.
NodePlayground.defaultConfig = { selectedNodeName: DEFAULT_WEBVIZ_NODE_NAME };

export default hot(Panel<Config>(NodePlayground));
