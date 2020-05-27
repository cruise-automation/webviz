// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowLeftBoldIcon from "@mdi/svg/svg/arrow-left-bold.svg";
import DeleteIcon from "@mdi/svg/svg/delete.svg";
import FileMultipleIcon from "@mdi/svg/svg/file-multiple.svg";
import HelpCircleIcon from "@mdi/svg/svg/help-circle.svg";
import React from "react";
import styled from "styled-components";

import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import TextContent from "webviz-core/src/components/TextContent";
import type { Explorer } from "webviz-core/src/panels/NodePlayground";
import TemplateIcon from "webviz-core/src/panels/NodePlayground/assets/file-document-edit.svg";
import HammerWrenchIcon from "webviz-core/src/panels/NodePlayground/assets/hammer-wrench.svg";
import nodePlaygroundDocs from "webviz-core/src/panels/NodePlayground/index.help.md";
import { type Script } from "webviz-core/src/panels/NodePlayground/script";
import { getNodeProjectConfig } from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/projectConfig";
import templates from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/templates";
import userUtilsReadMe from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/README.md";
import type { UserNodeDiagnostics } from "webviz-core/src/reducers/userNodes";
import { type UserNodes } from "webviz-core/src/types/panels";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const MenuWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 40px;
  background-color: ${colors.DARK1};
  & > * {
    margin: 10px;
  }
`;

const ExplorerWrapper = styled.div`
  display: ${({ show }: { show: boolean }) => (show ? "initial" : "none")};
  background-color: ${colors.GRAY2};
  max-width: 325px;
  min-width: 275px;
  overflow: auto;
`;

const ListItem = styled.li`
  padding: 5px;
  cursor: pointer;
  display: flex;
  font-size: 14px;
  justify-content: space-between;
  word-break: break-all;
  align-items: center;
  color: ${({ trusted }) => (!trusted ? colors.REDL1 : "inherit")};
  background-color: ${({ selected }: { selected: boolean }) => (selected ? colors.DARK9 : "transparent")};
  > span {
    opacity: 0;
  }
  &:hover {
    background-color: ${colors.DARK9};
    span {
      opacity: 1;
    }
  }
`;

const TemplateItem = styled.li`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 5px;
  cursor: pointer;
  display: flex;
  font-size: 14px;
  word-break: break-all;
  > span {
    display: block;
    margin: 3px 0;
  }
  &:hover {
    background-color: ${colors.DARK9};
  }
`;

const SFlex = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;

  pre {
    white-space: pre-wrap;
  }
`;

type NodesListProps = {
  nodes: UserNodes,
  selectNode: (id: string) => void,
  deleteNode: (id: string) => void,
  collapse: () => void,
  selectedNodeId: ?string,
  userNodeDiagnostics: {
    [guid: string]: UserNodeDiagnostics,
  },
};

const NodesList = ({
  nodes,
  selectNode,
  deleteNode,
  collapse,
  selectedNodeId,
  userNodeDiagnostics,
}: NodesListProps) => {
  return (
    <Flex col>
      <SidebarTitle title={"nodes"} collapse={collapse} />
      {Object.keys(nodes).map((nodeId) => {
        const trusted = userNodeDiagnostics[nodeId] ? userNodeDiagnostics[nodeId].trusted : true;
        return (
          <ListItem
            key={nodeId}
            selected={selectedNodeId === nodeId}
            onClick={() => selectNode(nodeId)}
            trusted={trusted}>
            {nodes[nodeId].name}
            <Icon onClick={() => deleteNode(nodeId)} medium>
              <DeleteIcon />
            </Icon>
          </ListItem>
        );
      })}
    </Flex>
  );
};

type Props = {|
  selectNode: (nodeId: string) => void,
  deleteNode: (nodeId: string) => void,
  userNodes: UserNodes,
  selectedNodeId: ?string,
  otherMarkdownDocsForTest?: string,
  needsUserTrust: boolean,
  userNodeDiagnostics: {
    [guid: string]: UserNodeDiagnostics,
  },
  explorer: Explorer,
  updateExplorer: (explorer: Explorer) => void,
  setScriptOverride: (script: Script, maxDepth?: number) => void,
  script: Script | null,
  addNewNode: (_: any, sourceCode?: string) => void,
|};

const RedDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${colors.REDL1};
  position: absolute;
  bottom: -2px;
  right: -2px;
`;

const { utilityFiles } = getNodeProjectConfig();

const SidebarTitle = ({ title, tooltip, collapse }: { title: string, tooltip?: string, collapse: () => void }) => (
  <Flex row style={{ alignItems: "center", color: colors.DARK9, padding: "5px" }}>
    <h3 style={{ textTransform: "uppercase" }}>{title}</h3>
    {tooltip && (
      <Icon style={{ cursor: "unset", marginLeft: "5px" }} medium tooltip={tooltip}>
        <HelpCircleIcon />
      </Icon>
    )}
    <div style={{ display: "flex", justifyContent: "flex-end", flexGrow: 1 }}>
      <Icon onClick={collapse} medium tooltip={"collapse"}>
        <ArrowLeftBoldIcon />
      </Icon>
    </div>
  </Flex>
);

const Sidebar = ({
  userNodes,
  selectNode,
  deleteNode,
  selectedNodeId,
  otherMarkdownDocsForTest,
  needsUserTrust,
  userNodeDiagnostics,
  explorer,
  updateExplorer,
  setScriptOverride,
  script,
  addNewNode,
}: Props) => {
  const nodesSelected = explorer === "nodes";
  const docsSelected = explorer === "docs";
  const utilsSelected = explorer === "utils";
  const templatesSelected = explorer === "templates";

  const gotoUtils = React.useCallback(
    (filePath) => {
      import(/* webpackChunkName: "monaco-api" */ "monaco-editor/esm/vs/editor/editor.api").then((monacoApi) => {
        const monacoFilePath = monacoApi.Uri.parse(`file://${filePath}`);
        const requestedModel = monacoApi.editor.getModel(monacoFilePath);
        if (!requestedModel) {
          return;
        }
        setScriptOverride(
          {
            filePath: requestedModel.uri.path,
            code: requestedModel.getValue(),
            readOnly: true,
            selection: undefined,
          },
          2
        );
      });
    },
    [setScriptOverride]
  );

  const explorers = React.useMemo(
    () => ({
      nodes: (
        <NodesList
          nodes={userNodes}
          selectNode={selectNode}
          deleteNode={deleteNode}
          collapse={() => updateExplorer(null)}
          selectedNodeId={selectedNodeId}
          userNodeDiagnostics={userNodeDiagnostics}
        />
      ),
      docs: (
        <SFlex>
          <SidebarTitle title={"docs"} collapse={() => updateExplorer(null)} />
          <TextContent style={{ backgroundColor: "transparent" }} linkTarget="_blank">
            {otherMarkdownDocsForTest || nodePlaygroundDocs}
          </TextContent>
          <br />
          <br />
          <TextContent style={{ backgroundColor: "transparent" }} linkTarget="_blank">
            {userUtilsReadMe}
          </TextContent>
        </SFlex>
      ),
      utils: (
        <Flex col style={{ position: "relative" }}>
          <SidebarTitle
            collapse={() => updateExplorer(null)}
            title={"utilities"}
            tooltip={`You can import any of these modules into your node using the following syntax: 'import { .. } from "./pointClouds.ts".\n\nWant to contribute? Scroll to the bottom of the docs for details!`}
          />
          {utilityFiles.map(({ fileName, filePath }) => (
            <ListItem
              key={filePath}
              onClick={gotoUtils.bind(null, filePath)}
              trusted
              selected={script && filePath === script.filePath}>
              {fileName}
            </ListItem>
          ))}
        </Flex>
      ),

      templates: (
        <Flex col>
          <SidebarTitle
            title={"templates"}
            tooltip={"Create nodes from these templates"}
            collapse={() => updateExplorer(null)}
          />
          {templates.map(({ name, description, template }, i) => (
            <TemplateItem key={`${name}-${i}`} onClick={addNewNode.bind(null, undefined, template)}>
              <span style={{ fontWeight: "bold" }}>{name}</span>
              <span>{description}</span>
            </TemplateItem>
          ))}
        </Flex>
      ),
    }),
    [
      addNewNode,
      deleteNode,
      gotoUtils,
      otherMarkdownDocsForTest,
      script,
      selectNode,
      selectedNodeId,
      updateExplorer,
      userNodeDiagnostics,
      userNodes,
    ]
  );

  return (
    <>
      <MenuWrapper>
        <Icon
          dataTest="node-explorer"
          onClick={() => updateExplorer(nodesSelected ? null : "nodes")}
          large
          tooltip={"nodes"}
          style={{ color: nodesSelected ? "inherit" : colors.DARK9, position: "relative" }}>
          <FileMultipleIcon />
          {needsUserTrust && <RedDot />}
        </Icon>
        <Icon
          dataTest="utils-explorer"
          onClick={() => updateExplorer(utilsSelected ? null : "utils")}
          large
          tooltip={"utilities"}
          style={{ color: utilsSelected ? "inherit" : colors.DARK9 }}>
          <HammerWrenchIcon />
        </Icon>
        <Icon
          dataTest="templates-explorer"
          onClick={() => updateExplorer(templatesSelected ? null : "templates")}
          large
          tooltip={"templates"}
          style={{ color: templatesSelected ? "inherit" : colors.DARK9 }}>
          <TemplateIcon />
        </Icon>
        <Icon
          dataTest="docs-explorer"
          onClick={() => updateExplorer(docsSelected ? null : "docs")}
          large
          tooltip={"docs"}
          style={{ color: docsSelected ? "inherit" : colors.DARK9 }}>
          <HelpCircleIcon />
        </Icon>
      </MenuWrapper>
      <ExplorerWrapper show={!!explorer}>{explorer && explorers[explorer]}</ExplorerWrapper>
    </>
  );
};

export default Sidebar;
