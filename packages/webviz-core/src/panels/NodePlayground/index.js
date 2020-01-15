// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxOutlineIcon from "@mdi/svg/svg/checkbox-marked-circle-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import PlusIcon from "@mdi/svg/svg/plus.svg";
import { some } from "lodash";
import * as React from "react";
import Dimensions from "react-container-dimensions";
import { hot } from "react-hot-loader/root";
import { useSelector, useDispatch } from "react-redux";
import styled from "styled-components";
import uuid from "uuid";

import { setUserNodes as setUserNodesAction } from "webviz-core/src/actions/panels";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Item from "webviz-core/src/components/Menu/Item";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import SpinningLoadingIcon from "webviz-core/src/components/SpinningLoadingIcon";
import BottomBar from "webviz-core/src/panels/NodePlayground/BottomBar";
import Sidebar from "webviz-core/src/panels/NodePlayground/Sidebar";
import { trustUserNode } from "webviz-core/src/players/UserNodePlayer/nodeSecurity";
import type { UserNodeState } from "webviz-core/src/reducers/userNodes";
import type { UserNodes } from "webviz-core/src/types/panels";
import { colors } from "webviz-core/src/util/colors";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";

const Editor = React.lazy(() =>
  import(/* webpackChunkName: "node-playground-editor" */ "webviz-core/src/panels/NodePlayground/Editor")
);

const skeletonBody = `import { Message } from "ros";

type InputTopicMsg = { /* YOUR INPUT TOPIC TYPE HERE */ };
type Output = { /* DEFINED YOUR OUTPUT HERE */ };

export const inputs = [];
export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}";

const publisher = (message: Message<InputTopicMsg>): Output => {
  return {};
};

export default publisher;`;

type Config = {|
  selectedNodeId: ?string,
  // Used only for storybook screenshot testing.
  editorForStorybook?: React.Node,
  vimMode: boolean,
|};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};

const UnsavedDot = styled.div`
  display: ${({ isSaved }: { isSaved: boolean }) => (isSaved ? "none" : "initial")}
  width: 6px;
  height: 6px;
  border-radius: 50%;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background-color: ${colors.DARK9};
`;

// Exported for screenshot testing.
export const NodePlaygroundSettings = ({ config, saveConfig }: Props) => (
  <Item
    icon={config.vimMode ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
    onClick={() => saveConfig({ vimMode: !config.vimMode })}>
    <span>Vim Mode</span>
  </Item>
);

const SecurityBarWrapper = styled.div`
  width: 100%;
  height: 40px;
  background-color: ${colors.REDL1};
  display: flex;
  justify-content: space-between;
  padding: 8px;
  align-items: center;
  font-weight: bold;
`;

const TrustButton = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 75px;
  padding: 4px 8px;
  vertical-align: middle;
  font-weight: bold;
  border: 2px solid ${colors.LIGHT1};
`;

const SecurityBar = ({ onClick }: { onClick: () => void }) => (
  <SecurityBarWrapper>
    <p>
      Warning: This panel will execute user-defined code that is coming from a remote source. Make sure you trust it.
    </p>
    <TrustButton data-test="trust-user-scripts" onClick={onClick}>
      Trust
      <Icon small>
        <CheckboxOutlineIcon />
      </Icon>
    </TrustButton>
  </SecurityBarWrapper>
);

export type Explorer = null | "docs" | "nodes";

function NodePlayground(props: Props) {
  const { config, saveConfig } = props;
  const { selectedNodeId, editorForStorybook, vimMode } = config;

  const [explorer, updateExplorer] = React.useState<Explorer>(null);

  const userNodes = useSelector((state) => state.panels.userNodes);
  const nodeDiagnosticsAndLogs = useSelector((state) => state.userNodes);
  const needsUserTrust = useSelector((state) => {
    const nodes: UserNodeState[] = (Object.values(state.userNodes): any);
    return some(nodes, ({ trusted }) => typeof trusted === "boolean" && !trusted);
  });

  const dispatch = useDispatch();
  const setUserNodes = React.useCallback((payload: UserNodes) => dispatch(setUserNodesAction(payload)), [dispatch]);

  const selectedNodeDiagnostics =
    selectedNodeId && nodeDiagnosticsAndLogs[selectedNodeId] ? nodeDiagnosticsAndLogs[selectedNodeId].diagnostics : [];
  const selectedNode = selectedNodeId ? userNodes[selectedNodeId] : undefined;
  // Holds the not yet saved source code.
  const [stagedScript, setStagedScript] = React.useState(selectedNode ? selectedNode.sourceCode : "");
  const isNodeSaved = !selectedNode || (!!selectedNode && stagedScript === selectedNode.sourceCode);
  const selectedNodeLogs =
    selectedNodeId && nodeDiagnosticsAndLogs[selectedNodeId] ? nodeDiagnosticsAndLogs[selectedNodeId].logs : [];

  React.useLayoutEffect(
    () => {
      if (selectedNode) {
        setStagedScript(selectedNode.sourceCode);
      }
    },
    [selectedNode]
  );

  // UX nicety so that the user can see which nodes need to be verified.
  React.useLayoutEffect(
    () => {
      if (needsUserTrust) {
        updateExplorer("nodes");
      }
    },
    [needsUserTrust]
  );

  const addNewNode = React.useCallback(
    () => {
      const newNodeId = uuid.v4();
      // TODO: Add integration test for this flow.
      trustUserNode({ id: newNodeId, sourceCode: skeletonBody }).then(() => {
        setUserNodes({
          [newNodeId]: {
            sourceCode: skeletonBody,
            name: `${DEFAULT_WEBVIZ_NODE_PREFIX}${newNodeId.split("-")[0]}`,
          },
        });
        saveConfig({ selectedNodeId: newNodeId });
      });
    },
    [saveConfig, setUserNodes]
  );

  const trustSelectedNode = React.useCallback(
    () => {
      if (!selectedNodeId || !selectedNode) {
        return;
      }
      trustUserNode({ id: selectedNodeId, sourceCode: selectedNode.sourceCode }).then(() => {
        // no-op in order to trigger the useUserNodes hook.
        setUserNodes({});
      });
    },
    [selectedNode, selectedNodeId, setUserNodes]
  );

  const saveNode = React.useCallback(
    () => {
      if (!selectedNodeId) {
        return;
      }
      trustUserNode({ id: selectedNodeId, sourceCode: stagedScript }).then(() => {
        setUserNodes({ [selectedNodeId]: { ...selectedNode, sourceCode: stagedScript } });
      });
    },
    [selectedNodeId, selectedNode, stagedScript, setUserNodes]
  );

  return (
    <Dimensions>
      {({ height, width }) => (
        <Flex col style={{ height, position: "relative" }}>
          <PanelToolbar floating menuContent={<NodePlaygroundSettings {...props} />} />
          <Flex style={{ height, width }}>
            <Sidebar
              explorer={explorer}
              updateExplorer={updateExplorer}
              selectNode={(nodeId) => {
                if (selectedNodeId) {
                  // Save current state so that user can seamlessly go back to previous work.
                  setUserNodes({
                    [selectedNodeId]: { ...selectedNode, sourceCode: stagedScript },
                  });
                }
                saveConfig({ selectedNodeId: nodeId });
              }}
              deleteNode={(nodeId) => {
                setUserNodes({ ...userNodes, [nodeId]: undefined });
                saveConfig({ selectedNodeId: undefined });
              }}
              selectedNodeId={selectedNodeId}
              userNodes={userNodes}
              needsUserTrust={needsUserTrust}
              nodeDiagnosticsAndLogs={nodeDiagnosticsAndLogs}
            />
            <Flex col>
              <Flex
                start
                style={{
                  flexGrow: 0,
                  backgroundColor: colors.DARK1,
                  alignItems: "center",
                }}>
                {selectedNodeId && (
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="node name"
                      value={selectedNode ? selectedNode.name : ""}
                      style={{ borderRadius: 0, margin: 0, backgroundColor: colors.DARK2 }}
                      spellCheck={false}
                      onChange={(e) => {
                        const newNodeName = e.target.value;
                        setUserNodes({
                          ...userNodes,
                          [selectedNodeId]: { ...selectedNode, name: newNodeName },
                        });
                      }}
                    />
                    <UnsavedDot isSaved={isNodeSaved} />
                  </div>
                )}
                <Icon
                  large
                  tooltip="new node"
                  dataTest="new-node"
                  style={{ color: colors.DARK9, padding: "0 5px" }}
                  onClick={addNewNode}>
                  <PlusIcon />
                </Icon>
              </Flex>

              {nodeDiagnosticsAndLogs[selectedNodeId] &&
                typeof nodeDiagnosticsAndLogs[selectedNodeId].trusted === "boolean" &&
                !nodeDiagnosticsAndLogs[selectedNodeId].trusted && <SecurityBar onClick={trustSelectedNode} />}
              <Flex col style={{ flexGrow: 1, position: "relative" }}>
                <div
                  key={`${height}x${width}`}
                  style={{
                    height: "100%",
                    width: "100%",
                    display: selectedNodeId
                      ? "initial"
                      : "none" /* Ensures the monaco-editor starts loading before the user opens it */,
                  }}>
                  <React.Suspense
                    fallback={
                      <Flex center style={{ width: "100%", height: "100%" }}>
                        <Icon large>
                          <SpinningLoadingIcon />
                        </Icon>
                      </Flex>
                    }>
                    {editorForStorybook || (
                      <Editor script={stagedScript} setScript={setStagedScript} vimMode={vimMode} />
                    )}
                  </React.Suspense>
                </div>
                <BottomBar
                  nodeId={selectedNodeId}
                  isSaved={isNodeSaved}
                  save={saveNode}
                  diagnostics={selectedNodeDiagnostics}
                  logs={selectedNodeLogs}
                />
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      )}
    </Dimensions>
  );
}

NodePlayground.panelType = "NodePlayground";
NodePlayground.defaultConfig = { selectedNodeId: undefined, vimMode: false };

export default hot(Panel<Config>(NodePlayground));
