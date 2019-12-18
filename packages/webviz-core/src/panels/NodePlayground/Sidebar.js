// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowLeftBoldIcon from "@mdi/svg/svg/arrow-left-bold.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import DeleteIcon from "@mdi/svg/svg/delete.svg";
import FileMultipleIcon from "@mdi/svg/svg/file-multiple.svg";
import HelpCircleIcon from "@mdi/svg/svg/help-circle.svg";
import React from "react";
import styled from "styled-components";

import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import TextContent from "webviz-core/src/components/TextContent";
import type { Explorer } from "webviz-core/src/panels/NodePlayground";
import nodePlaygroundDocs from "webviz-core/src/panels/NodePlayground/index.help.md";
import type { UserNodesState } from "webviz-core/src/reducers/userNodes";
import { type UserNodes } from "webviz-core/src/types/panels";
import { colors } from "webviz-core/src/util/colors";

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
  justify-content: space-between;
  word-break: break-all;
  align-items: center;
  color: ${({ trusted }) => (!trusted ? colors.REDL1 : "inherit")};
  background-color: ${({ selected }: { selected: boolean }) => (selected ? colors.DARK9 : "transparent")};
  span {
    opacity: 0;
  }
  &:hover {
    background-color: ${colors.DARK9};
    span {
      opacity: 1;
    }
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
  nodeDiagnosticsAndLogs: UserNodesState,
};

const NodesList = ({
  nodes,
  selectNode,
  deleteNode,
  collapse,
  selectedNodeId,
  nodeDiagnosticsAndLogs,
}: NodesListProps) => {
  const [search, updateSearch] = React.useState("");
  return (
    <Flex col>
      <Flex row style={{ padding: "5px", alignItems: "center" }}>
        <Flex style={{ position: "relative", flexGrow: 1 }}>
          <input
            placeholder="search nodes"
            type="text"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            style={{ backgroundColor: colors.DARK2, margin: 0, padding: "4px", width: "100%" }}
            spellCheck={false}
          />
          {search ? (
            <Icon
              small
              onClick={() => updateSearch("")}
              style={{
                color: colors.DARK9,
                position: "absolute",
                right: "5px",
                top: "50%",
                transform: "translateY(-50%)",
              }}>
              <CloseIcon />
            </Icon>
          ) : null}
        </Flex>
        <Icon onClick={collapse} medium tooltip={"collapse"}>
          <ArrowLeftBoldIcon />
        </Icon>
      </Flex>
      {Object.keys(nodes)
        .filter((nodeId) => !search || new RegExp(search).test(nodeId))
        .map((nodeId) => {
          const trusted = nodeDiagnosticsAndLogs[nodeId] ? nodeDiagnosticsAndLogs[nodeId].trusted : true;
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
  nodeDiagnosticsAndLogs: UserNodesState,
  explorer: Explorer,
  updateExplorer: (explorer: Explorer) => void,
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

const Sidebar = ({
  userNodes,
  selectNode,
  deleteNode,
  selectedNodeId,
  otherMarkdownDocsForTest,
  needsUserTrust,
  nodeDiagnosticsAndLogs,
  explorer,
  updateExplorer,
}: Props) => {
  const nodesSelected = explorer === "nodes";
  const docsSelected = explorer === "docs";
  return (
    <>
      <MenuWrapper>
        <Icon
          dataTest="node-explorer"
          onClick={() => updateExplorer(nodesSelected ? null : "nodes")}
          large
          tooltip={"node explorer"}
          style={{ color: nodesSelected ? "inherit" : colors.DARK9, position: "relative" }}>
          <FileMultipleIcon />
          {needsUserTrust && <RedDot />}
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
      <ExplorerWrapper show={!!explorer}>
        {explorer === "nodes" ? (
          <NodesList
            nodes={userNodes}
            selectNode={selectNode}
            deleteNode={deleteNode}
            collapse={() => updateExplorer(null)}
            selectedNodeId={selectedNodeId}
            nodeDiagnosticsAndLogs={nodeDiagnosticsAndLogs}
          />
        ) : (
          <SFlex>
            <TextContent style={{ backgroundColor: "transparent" }} linkTarget="_blank">
              {otherMarkdownDocsForTest || nodePlaygroundDocs}
            </TextContent>
          </SFlex>
        )}
      </ExplorerWrapper>
    </>
  );
};

export default Sidebar;
