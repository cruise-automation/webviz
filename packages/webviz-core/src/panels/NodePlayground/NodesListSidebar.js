// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowLeftBoldIcon from "@mdi/svg/svg/arrow-left-bold.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import FileIcon from "@mdi/svg/svg/file.svg";
import PlusIcon from "@mdi/svg/svg/plus.svg";
import React, { useState } from "react";
import styled from "styled-components";

import style from "./index.module.scss";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import IconButton from "webviz-core/src/components/IconButton";
import { type NodePayload } from "webviz-core/src/types/panels";

const SButton = styled.button`
  position: absolute;
  top: 10px;
  left: 10px;
  width: 30px;
  z-index: 10;
`;

const SListItem = styled.li`
  padding: 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  word-break: break-all;
`;

type NodeListItem = {
  text: string,
  readOnly: boolean,
};

type Props = {
  onSelect: (nodeName: ?string) => void,
  onUpdate: (NodePayload) => void,
  selectedNode: ?string,
  nodes: { [nodeName: string]: NodeListItem },
};

function NodesListSidebar(props: Props) {
  const { onSelect, selectedNode, nodes, onUpdate } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNodeOutputName, setNewNodeOutputName] = useState("");
  if (!isModalOpen) {
    return (
      <SButton
        data-test-node-playground-sidebar
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(!isModalOpen);
        }}
        tooltip="Show Webviz nodes to edit">
        <Icon style={{ color: "white", marginLeft: -2 }}>
          <FileIcon />
        </Icon>
      </SButton>
    );
  }

  return (
    <Flex
      col
      onClick={(e) => {
        // Clicking to drag NodesListSidebar should not close it
        e.stopPropagation();
      }}
      className={style.filesModal}>
      <Flex style={{ padding: 8, justifyContent: "space-between", flex: "initial" }}>
        Nodes
        <Icon onClick={() => setIsModalOpen(!isModalOpen)}>
          <ArrowLeftBoldIcon />
        </Icon>
      </Flex>
      <div style={{ overflowY: "auto" }}>
        <ul>
          <SListItem style={{ padding: 5, justifyContent: "space-around" }}>
            <input
              type="text"
              style={{ width: "100%" }}
              value={newNodeOutputName}
              placeholder="/new/node/output"
              onChange={(e) => setNewNodeOutputName(e.target.value)}
            />
            <IconButton
              tooltip="Add Webviz Node"
              id="add-webviz-node"
              onClick={() => {
                if (newNodeOutputName && !nodes[newNodeOutputName]) {
                  onUpdate({ [newNodeOutputName]: "" });
                }
              }}
              icon={<PlusIcon />}
            />
          </SListItem>
          {Object.keys(nodes).map((nodeName) => (
            <SListItem
              key={nodeName}
              className={selectedNode === nodeName ? style.highlight : null}
              onClick={() => onSelect(nodeName)}>
              {nodes[nodeName].readOnly ? (
                nodeName
              ) : (
                <>
                  <span>{nodeName}</span>
                  <Icon
                    onClick={() => {
                      onUpdate({ [nodeName]: undefined });
                      if (selectedNode === nodeName) {
                        onSelect(null);
                      }
                    }}>
                    <CloseIcon />
                  </Icon>
                </>
              )}
            </SListItem>
          ))}
        </ul>
      </div>
    </Flex>
  );
}

export default NodesListSidebar;
