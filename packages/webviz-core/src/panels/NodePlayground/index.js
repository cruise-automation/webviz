// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ArrowLeftIcon from "@mdi/svg/svg/arrow-left.svg";
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import PlusIcon from "@mdi/svg/svg/plus.svg";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import { useSelector, useDispatch } from "react-redux";
import styled from "styled-components";
import uuid from "uuid";

import { type Script } from "./script";
import { setUserNodes as setUserNodesAction } from "webviz-core/src/actions/panels";
import { fetchPublishedNodes, fetchPublishedNodesList, publishNode } from "webviz-core/src/actions/userNodes";
import Button from "webviz-core/src/components/Button";
import Dimensions from "webviz-core/src/components/Dimensions";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Item from "webviz-core/src/components/Menu/Item";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import ResizableSplitFlex from "webviz-core/src/components/ResizableSplitFlex";
import SpinningLoadingIcon from "webviz-core/src/components/SpinningLoadingIcon";
import TextContent from "webviz-core/src/components/TextContent";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import BottomBar from "webviz-core/src/panels/NodePlayground/BottomBar";
import Playground from "webviz-core/src/panels/NodePlayground/playground-icon.svg";
import Sidebar from "webviz-core/src/panels/NodePlayground/Sidebar";
import type { UserNodes } from "webviz-core/src/types/panels";
import { DEFAULT_WEBVIZ_NODE_PREFIX, $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import { useGetCurrentValue } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const WEBVIZ_SOURCE_TWO_REGEX = new RegExp(`^${$WEBVIZ_SOURCE_2}`);

const Editor = React.lazy(() =>
  import(/* webpackChunkName: "node-playground-editor" */ "webviz-core/src/panels/NodePlayground/Editor")
);

const skeletonBody = `import { Input, Messages } from "ros";

type Output = {};
type GlobalVariables = { id: number };

export const inputs = [];
export const output = "{{OUTPUT_TOPIC_PLACEHOLDER}}";

// Populate 'Input' with a parameter to properly type your inputs, e.g. 'Input<"/your_input_topic">'
const publisher = (message: Input<>, globalVars: GlobalVariables): Output => {
  return {};
};

export default publisher;`;

type Config = {|
  // Either selectedNodeId or selectedPublishedNodeTopic should be set at any given time.
  // Set when a user selects any node installed in the layout, published or layout-local
  selectedNodeId: ?string,
  // Set when a user previews a published node from the published nodes list.
  selectedPublishedNodeTopic?: ?string,
  // Used only for storybook screenshot testing.
  editorForStorybook?: React.Node,
  // Used only for storybook screenshot testing.
  additionalBackStackItems?: Script[],
  vimMode: boolean,
  autoFormatOnSave?: boolean,
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
  <>
    <Item
      icon={config.autoFormatOnSave ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
      onClick={() => saveConfig({ autoFormatOnSave: !config.autoFormatOnSave })}>
      <span>Auto-format on save</span>
    </Item>
    <Item
      icon={config.vimMode ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
      onClick={() => saveConfig({ vimMode: !config.vimMode })}>
      <span>Vim Mode</span>
    </Item>
  </>
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

export type Explorer = null | "docs" | "nodes" | "utils" | "templates" | "publishedNodes";

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
  const { autoFormatOnSave, selectedNodeId, selectedPublishedNodeTopic, editorForStorybook, vimMode } = config;
  const getSelectedPublishedTopic = useGetCurrentValue(selectedPublishedNodeTopic);

  const [explorer, updateExplorer] = React.useState<Explorer>(null);
  const [bottomBarSplitPercent, setBottomBarSplitPercent] = React.useState<number>(1);
  const [scriptBackStack, setScriptBackStack] = React.useState<Script[]>([]);

  const bottomBarOpen = bottomBarSplitPercent < 0.95;
  const toggleBottomBarOpen = React.useCallback(() => setBottomBarSplitPercent(bottomBarOpen ? 1 : 0.8), [
    bottomBarOpen,
  ]);
  const nodePlaygroundSourceControl = useExperimentalFeature("nodePlaygroundSourceControl");
  const getPublishedNodesApi = useGetCurrentValue(getGlobalHooks().getPublishedNodesApi());

  const dispatch = useDispatch();
  const userNodes = useSelector((state) => state.persistedState.panels.userNodes);
  const { rosLib, publishedNodesList, publishedNodesByTopic, userNodeDiagnostics } = useSelector(
    (state) => state.userNodes
  );

  const selectedNodeDiagnostics =
    selectedNodeId && userNodeDiagnostics[selectedNodeId] ? userNodeDiagnostics[selectedNodeId].diagnostics : [];
  const selectedCompiledNodeData = selectedNodeId ? userNodeDiagnostics[selectedNodeId] : null;
  const selectedNode = selectedNodeId ? userNodes[selectedNodeId] : undefined;
  const selectedPublishedNode =
    !selectedNodeId && selectedPublishedNodeTopic ? publishedNodesByTopic[selectedPublishedNodeTopic] : null;

  // Holds the currently active script
  const currentScript = scriptBackStack.length > 0 ? scriptBackStack[scriptBackStack.length - 1] : null;
  const isCurrentScriptSelectedNode = !!selectedNode && !!currentScript && scriptBackStack.length === 1;
  const isNodeSaved =
    !isCurrentScriptSelectedNode || selectedNode?.published || currentScript?.code === selectedNode?.sourceCode;
  const selectedNodeLogs =
    selectedNodeId && userNodeDiagnostics[selectedNodeId] ? userNodeDiagnostics[selectedNodeId].logs : [];

  const canFork = !!selectedNode?.published;
  const canPublish =
    isNodeSaved && !canFork && selectedCompiledNodeData?.metadata && selectedCompiledNodeData?.diagnostics.length === 0;

  const selectedNodeName = selectedNode?.name ?? selectedPublishedNode?.outputTopic ?? "";
  const currentScriptTabTitle = selectedNodeName
    ? `${selectedNodeName}${currentScript?.readOnly ? " (READONLY)" : ""}`
    : "node name";

  const setUserNodes = React.useCallback((payload: UserNodes) => dispatch(setUserNodesAction(payload)), [dispatch]);

  const selectedNodeScript = React.useMemo(() => {
    if (selectedNode && selectedNodeId) {
      let sourceCode = selectedNode.sourceCode;
      if (selectedNode.published) {
        const publishedNode = publishedNodesByTopic[selectedNode.name];
        if (publishedNode) {
          sourceCode = publishedNode.sourceCode;
        } else {
          sourceCode = "// Loading source code... Please wait.";
        }
      }

      return { filePath: `/${selectedNodeId}`, code: sourceCode, readOnly: selectedNode.published };
    } else if (selectedPublishedNode && selectedPublishedNodeTopic) {
      // Replace slashes with $ so the editor doesn't think these files are in a subdirectory
      const publishedNodeFilePath = `/${selectedPublishedNodeTopic.replace("/", "$")}`;
      return {
        filePath: publishedNodeFilePath,
        code: selectedPublishedNode.sourceCode,
        readOnly: true,
      };
    }
  }, [publishedNodesByTopic, selectedNode, selectedNodeId, selectedPublishedNode, selectedPublishedNodeTopic]);

  // Update the node topics when we get new compiledNodeData
  React.useEffect(() => {
    if (userNodeDiagnostics) {
      const updatedUserNodes = {};
      Object.keys(userNodeDiagnostics).forEach((nodeId) => {
        const userNode = userNodes[nodeId];
        const node = userNodeDiagnostics[nodeId];
        // TODO: Remove this topic correction when we update the NodePlaygroundDataProvider
        // to only register one node per source
        if (userNode && node.metadata) {
          const correctedOutputTopic = node.metadata && node.metadata.outputTopic.replace(WEBVIZ_SOURCE_TWO_REGEX, "");
          if (correctedOutputTopic && correctedOutputTopic !== userNode.name) {
            updatedUserNodes[nodeId] = { ...userNode, name: correctedOutputTopic };
          }
        }
      });
      if (Object.keys(updatedUserNodes).length > 0) {
        setUserNodes(updatedUserNodes);
      }
    }
  }, [setUserNodes, userNodeDiagnostics, userNodes]);

  // Lazily fetch the publishedNodesList if we haven't yet
  React.useEffect(() => {
    if (nodePlaygroundSourceControl && !publishedNodesList) {
      dispatch(fetchPublishedNodesList());
    }
  }, [dispatch, nodePlaygroundSourceControl, publishedNodesList]);

  // Fetch the selectedPublishedNodeTopic when the panel loads
  React.useEffect(() => {
    const initialSelectedPublishedTopic = getSelectedPublishedTopic();
    if (nodePlaygroundSourceControl && initialSelectedPublishedTopic) {
      dispatch(fetchPublishedNodes([initialSelectedPublishedTopic]));
    }
  }, [dispatch, getSelectedPublishedTopic, nodePlaygroundSourceControl]);

  // Update the scriptBackStack when the selectedNodeScript changes
  React.useLayoutEffect(() => {
    if (selectedNodeScript) {
      const testItems = props.config.additionalBackStackItems || [];
      setScriptBackStack([selectedNodeScript, ...testItems]);
    }
  }, [props.config.additionalBackStackItems, selectedNodeScript]);

  const addNewNode = React.useCallback((_, code?: string) => {
    const newNodeId = uuid.v4();
    const outputTopic = `${DEFAULT_WEBVIZ_NODE_PREFIX}${newNodeId.split("-")[0]}`;
    const sourceCode = code || skeletonBody.replace("{{OUTPUT_TOPIC_PLACEHOLDER}}", outputTopic);
    setUserNodes({ [newNodeId]: { sourceCode, name: outputTopic } });
    saveConfig({ selectedNodeId: newNodeId, selectedPublishedNodeTopic: null });
  }, [saveConfig, setUserNodes]);

  const saveNode = React.useCallback((script) => {
    if (!selectedNodeId || !script) {
      return;
    }
    setUserNodes({ [selectedNodeId]: { ...selectedNode, sourceCode: script } });
  }, [selectedNode, selectedNodeId, setUserNodes]);

  const setScriptOverride = React.useCallback((script: Script, maxDepth?: number) => {
    if (maxDepth && scriptBackStack.length >= maxDepth) {
      setScriptBackStack([...scriptBackStack.slice(0, maxDepth - 1), script]);
    } else {
      setScriptBackStack([...scriptBackStack, script]);
    }
  }, [scriptBackStack]);

  const goBack = React.useCallback(() => {
    setScriptBackStack(scriptBackStack.slice(0, scriptBackStack.length - 1));
  }, [scriptBackStack]);

  const setScriptCode = React.useCallback((code: string) => {
    // update code at top of backstack
    const backStack = [...scriptBackStack];
    if (backStack.length > 0) {
      const script = backStack.pop();
      if (!script.readOnly) {
        setScriptBackStack([...backStack, { ...script, code }]);
      }
    }
  }, [scriptBackStack]);

  const selectNode = React.useCallback((nodeId: string) => {
    const oldSelectedNode = userNodes[selectedNodeId];
    if (
      selectedNodeId &&
      currentScript &&
      isCurrentScriptSelectedNode &&
      oldSelectedNode.sourceCode !== currentScript.code
    ) {
      // Save current state so that user can seamlessly go back to previous work.
      setUserNodes({
        [selectedNodeId]: { ...selectedNode, sourceCode: currentScript.code },
      });
    }
    saveConfig({ selectedNodeId: nodeId, selectedPublishedNodeTopic: null });
  }, [currentScript, isCurrentScriptSelectedNode, saveConfig, selectedNode, selectedNodeId, setUserNodes, userNodes]);

  const selectPublishedNode = React.useCallback((publishedTopic: string) => {
    (async () => {
      saveConfig({ selectedNodeId: null, selectedPublishedNodeTopic: publishedTopic });
      // Make sure we've cached the source for the topic
      await dispatch(fetchPublishedNodes([publishedTopic]));
    })();
  }, [dispatch, saveConfig]);

  const deleteNode = React.useCallback((nodeId) => {
    setUserNodes({ [nodeId]: undefined });
    saveConfig({ selectedNodeId: null, selectedPublishedNodeTopic: null });
  }, [saveConfig, setUserNodes]);

  const addPublishedNode = React.useCallback((publishedTopic: string) => {
    (async () => {
      const [publishedNode] = await dispatch(fetchPublishedNodes([publishedTopic]));
      if (publishedNode) {
        const newNodeId = uuid.v4();
        setUserNodes({ [newNodeId]: { published: true, name: publishedTopic } });
      }
    })();
  }, [dispatch, setUserNodes]);

  const forkSelectedNode = React.useCallback(() => {
    if (!selectedNodeScript || !selectedNode) {
      return;
    }

    const newNodeId = uuid.v4();
    setUserNodes({
      [newNodeId]: {
        published: false,
        name: selectedNode.name,
        sourceCode: selectedNodeScript.code,
        forkedFromVersion: selectedNode.versionNumber,
      },
      ...(selectedNodeId ? { [selectedNodeId]: undefined } : {}),
    });
    saveConfig({ selectedNodeId: newNodeId });
  }, [saveConfig, selectedNode, selectedNodeId, selectedNodeScript, setUserNodes]);

  const publishSelectedNode = React.useCallback(() => {
    const publishedNodesApi = getPublishedNodesApi();
    const compiledNodeMetadata = selectedCompiledNodeData?.metadata;
    if (!publishedNodesApi || !selectedNode || !selectedNodeId || !compiledNodeMetadata) {
      return;
    }
    const { inputTopics, outputTopic } = compiledNodeMetadata;
    const nodeToPublish = {
      outputTopic,
      inputTopics,
      description: "description!", // TODO: Fill in using the publish modal
      sourceCode: selectedNode.sourceCode,
    };
    dispatch(publishNode(nodeToPublish, selectedNodeId)).then((publishedNode) => {
      console.log(`Version ${publishedNode.versionNumber} published!`);
    });
  }, [dispatch, getPublishedNodesApi, selectedCompiledNodeData, selectedNode, selectedNodeId]);

  return (
    <Dimensions>
      {({ height, width }) => (
        <Flex grow col style={{ height, position: "relative" }}>
          <PanelToolbar floating menuContent={<NodePlaygroundSettings {...props} />} />
          <Flex grow style={{ height, width }}>
            <Sidebar
              explorer={explorer}
              updateExplorer={updateExplorer}
              selectNode={selectNode}
              deleteNode={deleteNode}
              addPublishedNode={addPublishedNode}
              selectPublishedNode={selectPublishedNode}
              selectedNodeId={selectedNodeId}
              userNodes={userNodes}
              userNodeDiagnostics={userNodeDiagnostics}
              publishedNodes={publishedNodesList || []}
              script={currentScript}
              setScriptOverride={setScriptOverride}
              addNewNode={addNewNode}
            />
            <Flex grow col>
              <Flex
                grow
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
                {currentScript && (
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        alignItems: "center",
                        backgroundColor: colors.DARK2,
                        borderRadius: 0,
                        display: "flex",
                        height: 22,
                        margin: 0,
                        padding: "0 16px",
                        whiteSpace: "nowrap",
                        cursor: "default",
                        width: `${currentScriptTabTitle.length}ch`, // Width based on character count of title + padding
                      }}>
                      {currentScriptTabTitle}
                    </div>
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

              <Flex grow col style={{ flexGrow: 1, position: "relative" }}>
                {!scriptBackStack.length && <WelcomeScreen addNewNode={addNewNode} updateExplorer={updateExplorer} />}

                <ResizableSplitFlex column splitPercent={bottomBarSplitPercent} onChange={setBottomBarSplitPercent}>
                  <div
                    key={`${height}x${width}`}
                    data-nativeundoredo="true"
                    style={{
                      height: "100%",
                      width: "100%",
                      display: currentScript
                        ? "initial"
                        : "none" /* Ensures the monaco-editor starts loading before the user opens it */,
                    }}>
                    <React.Suspense
                      fallback={
                        <Flex grow center style={{ width: "100%", height: "100%" }}>
                          <Icon large>
                            <SpinningLoadingIcon />
                          </Icon>
                        </Flex>
                      }>
                      {editorForStorybook || (
                        <Editor
                          autoFormatOnSave={!!autoFormatOnSave}
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
                  {!selectedPublishedNode /* Don't show the BottomBar when previewing a publishedNode */ && (
                    <div style={{ width: "100%", height: "100%", minHeight: "28px" }}>
                      <BottomBar
                        nodeId={selectedNodeId}
                        isSaved={isNodeSaved}
                        canFork={canFork}
                        canPublish={canPublish}
                        save={() => saveNode(currentScript?.code)}
                        fork={forkSelectedNode}
                        publish={publishSelectedNode}
                        diagnostics={selectedNodeDiagnostics}
                        logs={selectedNodeLogs}
                        open={bottomBarOpen}
                        toggleBottomBarOpen={toggleBottomBarOpen}
                      />
                    </div>
                  )}
                </ResizableSplitFlex>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      )}
    </Dimensions>
  );
}

NodePlayground.panelType = "NodePlayground";
NodePlayground.defaultConfig = { selectedNodeId: undefined, vimMode: false, autoFormatOnSave: true };

export default hot(Panel<Config>(NodePlayground));
