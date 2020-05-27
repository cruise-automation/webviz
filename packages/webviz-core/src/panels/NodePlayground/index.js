// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ArrowLeftIcon from "@mdi/svg/svg/arrow-left.svg";
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

import { type Script } from "./script";
import { setUserNodes as setUserNodesAction } from "webviz-core/src/actions/panels";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Item from "webviz-core/src/components/Menu/Item";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import SpinningLoadingIcon from "webviz-core/src/components/SpinningLoadingIcon";
import TextContent from "webviz-core/src/components/TextContent";
import BottomBar from "webviz-core/src/panels/NodePlayground/BottomBar";
import Playground from "webviz-core/src/panels/NodePlayground/playground-icon.svg";
import Sidebar from "webviz-core/src/panels/NodePlayground/Sidebar";
import { trustUserNode } from "webviz-core/src/players/UserNodePlayer/nodeSecurity";
import type { UserNodeDiagnostics } from "webviz-core/src/reducers/userNodes";
import type { UserNodes } from "webviz-core/src/types/panels";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const Editor = React.lazy(() =>
  import(/* webpackChunkName: "node-playground-editor" */ "webviz-core/src/panels/NodePlayground/Editor")
);

const skeletonBody = `import { Input, Messages } from "ros";

type Output = {};

export const inputs = [];
export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}";

// Populate 'Input' with a parameter to properly type your inputs, e.g. 'Input<"/your_input_topic">'
const publisher = (message: Input<>): Output => {
  return {};
};

export default publisher;`;

type Config = {|
  selectedNodeId: ?string,
  // Used only for storybook screenshot testing.
  editorForStorybook?: React.Node,
  // Used only for storybook screenshot testing.
  additionalBackStackItems?: Script[],
  vimMode: boolean,
|};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};

const UnsavedDot = styled.div`
  display: ${({ isSaved }: { isSaved: boolean }) => (isSaved ? "none" : "initial")};
  width: 6px;
  height: 6px;
  border-radius: 50%;
  position: absolute;
  right: 8px;
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

const SWelcomeScreen = styled.div`
  display: flex;
  text-align: center;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 25%;
  height: 100%;
  > * {
    margin: 4px 0;
  }
`;

export type Explorer = null | "docs" | "nodes" | "utils" | "templates";

const WelcomeScreen = ({
  addNewNode,
  updateExplorer,
}: {|
  addNewNode: () => void,
  updateExplorer: (explorer: Explorer) => void,
|}) => {
  return (
    <SWelcomeScreen>
      <Playground />
      <TextContent>
        Welcome to Node Playground! Get started by reading the{" "}
        <a
          href=""
          onClick={(e) => {
            e.preventDefault();
            updateExplorer("docs");
          }}>
          docs
        </a>
        , or just create a new node.
      </TextContent>
      <Button style={{ marginTop: "8px" }} onClick={addNewNode}>
        <Icon medium>
          <PlusIcon />
        </Icon>{" "}
        New node
      </Button>
    </SWelcomeScreen>
  );
};

function NodePlayground(props: Props) {
  const { config, saveConfig } = props;
  const { selectedNodeId, editorForStorybook, vimMode } = config;

  const [explorer, updateExplorer] = React.useState<Explorer>(null);

  const userNodes = useSelector((state) => state.panels.userNodes);
  const userNodeDiagnostics = useSelector((state) => state.userNodes.userNodeDiagnostics);
  const rosLib = useSelector((state) => state.userNodes.rosLib);
  const needsUserTrust = useSelector((state) => {
    const nodes: UserNodeDiagnostics[] = (Object.values(state.userNodes.userNodeDiagnostics): any);
    return some(nodes, ({ trusted }) => typeof trusted === "boolean" && !trusted);
  });

  const dispatch = useDispatch();
  const setUserNodes = React.useCallback((payload: UserNodes) => dispatch(setUserNodesAction(payload)), [dispatch]);

  const selectedNodeDiagnostics =
    selectedNodeId && userNodeDiagnostics[selectedNodeId] ? userNodeDiagnostics[selectedNodeId].diagnostics : [];
  const selectedNode = selectedNodeId ? userNodes[selectedNodeId] : undefined;
  const [scriptBackStack, setScriptBackStack] = React.useState<Script[]>([]);
  // Holds the currently active script
  const currentScript = scriptBackStack.length > 0 ? scriptBackStack[scriptBackStack.length - 1] : null;
  const isCurrentScriptSelectedNode = !!selectedNode && !!currentScript && currentScript.filePath === selectedNode.name;
  const isNodeSaved = !isCurrentScriptSelectedNode || currentScript?.code === selectedNode?.sourceCode;
  const selectedNodeLogs =
    selectedNodeId && userNodeDiagnostics[selectedNodeId] ? userNodeDiagnostics[selectedNodeId].logs : [];

  const inputTitle = currentScript
    ? currentScript.filePath + (currentScript.readOnly ? " (READONLY)" : "")
    : "node name";
  const inputStyle = {
    borderRadius: 0,
    margin: 0,
    backgroundColor: colors.DARK2,
    padding: "4px 20px",
    width: `${inputTitle.length + 4}ch`, // Width based on character count of title + padding
  };

  React.useLayoutEffect(
    () => {
      if (selectedNode) {
        const testItems = props.config.additionalBackStackItems || [];
        setScriptBackStack([
          { filePath: selectedNode.name, code: selectedNode.sourceCode, readOnly: false },
          ...testItems,
        ]);
      }
    },
    [props.config.additionalBackStackItems, selectedNode]
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
    (_, code?: string) => {
      const newNodeId = uuid.v4();
      const sourceCode = code || skeletonBody;
      // TODO: Add integration test for this flow.
      trustUserNode({ id: newNodeId, sourceCode }).then(() => {
        setUserNodes({
          [newNodeId]: {
            sourceCode,
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
    (script) => {
      if (!selectedNodeId || !script) {
        return;
      }
      trustUserNode({ id: selectedNodeId, sourceCode: script }).then(() => {
        setUserNodes({ [selectedNodeId]: { ...selectedNode, sourceCode: script } });
      });
    },
    [selectedNode, selectedNodeId, setUserNodes]
  );

  const setScriptOverride = React.useCallback(
    (script: Script, maxDepth?: number) => {
      if (maxDepth && scriptBackStack.length >= maxDepth) {
        setScriptBackStack([...scriptBackStack.slice(0, maxDepth - 1), script]);
      } else {
        setScriptBackStack([...scriptBackStack, script]);
      }
    },
    [scriptBackStack]
  );

  const goBack = React.useCallback(
    () => {
      setScriptBackStack(scriptBackStack.slice(0, scriptBackStack.length - 1));
    },
    [scriptBackStack]
  );

  const setScriptCode = React.useCallback(
    (code: string) => {
      // update code at top of backstack
      const backStack = [...scriptBackStack];
      if (backStack.length > 0) {
        const script = backStack.pop();
        if (!script.readOnly) {
          setScriptBackStack([...backStack, { ...script, code }]);
        }
      }
    },
    [scriptBackStack]
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
                if (selectedNodeId && currentScript && isCurrentScriptSelectedNode) {
                  // Save current state so that user can seamlessly go back to previous work.
                  setUserNodes({
                    [selectedNodeId]: { ...selectedNode, sourceCode: currentScript.code },
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
              userNodeDiagnostics={userNodeDiagnostics}
              script={currentScript}
              setScriptOverride={setScriptOverride}
              addNewNode={addNewNode}
            />
            <Flex col>
              <Flex
                start
                style={{
                  flexGrow: 0,
                  backgroundColor: colors.DARK1,
                  alignItems: "center",
                }}>
                {scriptBackStack.length > 1 && (
                  <Icon large tooltip="Go back" dataTest="go-back" style={{ color: colors.DARK9 }} onClick={goBack}>
                    <ArrowLeftIcon />
                  </Icon>
                )}
                {selectedNodeId && (
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="node name"
                      value={inputTitle}
                      disabled={!currentScript || currentScript.readOnly}
                      style={inputStyle}
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

              {userNodeDiagnostics[selectedNodeId] &&
                typeof userNodeDiagnostics[selectedNodeId].trusted === "boolean" &&
                !userNodeDiagnostics[selectedNodeId].trusted && <SecurityBar onClick={trustSelectedNode} />}
              <Flex col style={{ flexGrow: 1, position: "relative" }}>
                {!selectedNodeId && <WelcomeScreen addNewNode={addNewNode} updateExplorer={updateExplorer} />}
                <div
                  key={`${height}x${width}`}
                  data-nativeundoredo="true"
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
                      <Editor
                        script={currentScript}
                        setScriptCode={setScriptCode}
                        setScriptOverride={setScriptOverride}
                        vimMode={vimMode}
                        rosLib={rosLib}
                        resizeKey={`${width}-${height}-${explorer || "none"}-${selectedNodeId || "none"}`}
                        save={saveNode}
                      />
                    )}
                  </React.Suspense>
                </div>
                <BottomBar
                  nodeId={selectedNodeId}
                  isSaved={isNodeSaved}
                  save={() => saveNode(currentScript?.code)}
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
