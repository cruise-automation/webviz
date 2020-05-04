// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tree } from "antd";
import React, { type Node } from "react";
import styled from "styled-components";

import renderNamespaceNodes, { type NamespaceNode } from "./renderNamespaceNodes";
import TreeNodeRow from "./TreeNodeRow";
import type { TreeNode, NamespacesByTopic } from "./types";
import type { Topic } from "webviz-core/src/players/types";

export const SWITCHER_WIDTH = 24;

export const SRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
`;
export const SToggles = styled.div`
  display: flex;
  align-items: center;
`;
export const SToggle = styled.div`
  width: 24px;
  height: 24px;
`;

type Props = {|
  availableNamespacesByTopic: NamespacesByTopic,
  checkedKeysSet: Set<string>,
  children: TreeNode[],
  expandedKeys: string[],
  saveConfig: (any) => void,
  setCurrentEditingTopic: (?Topic) => void,
  settingsChangedKeysSet: Set<string>,
  width: number,
|};

// A recursive function for generating tree nodes UI. Must use function instead of React component as
// Tree/TreeNode can only accept TreeNode as children.
export default function renderTreeNodes({
  availableNamespacesByTopic,
  checkedKeysSet,
  children,
  expandedKeys,
  saveConfig,
  setCurrentEditingTopic,
  settingsChangedKeysSet,
  width,
}: Props): ?(Node[]) {
  const titleWidth = width - SWITCHER_WIDTH;
  return children.map((item) => {
    const { key } = item;
    const itemChildren = item.type === "group" ? item.children : [];
    const topicName = item.type === "topic" ? item.topicName : "";

    const availableNamespaces = (topicName && availableNamespacesByTopic[topicName]) || [];
    const namespaceNodes: NamespaceNode[] = availableNamespaces.map((namespace) => {
      const namespaceKey = `ns:${topicName}:${namespace}`;
      return {
        key: namespaceKey,
        namespace,
        checked: checkedKeysSet.has(namespaceKey),
      };
    });

    return (
      <Tree.TreeNode
        key={key}
        title={
          <TreeNodeRow
            checkedKeysSet={checkedKeysSet}
            expandedKeys={expandedKeys}
            node={item}
            saveConfig={saveConfig}
            setCurrentEditingTopic={setCurrentEditingTopic}
            settingsChanged={settingsChangedKeysSet.has(key)}
            width={titleWidth}
          />
        }>
        {namespaceNodes.length > 0 &&
          renderNamespaceNodes({
            checkedKeysSet,
            children: namespaceNodes,
            saveConfig,
            topicName,
            width: titleWidth,
          })}
        {itemChildren &&
          renderTreeNodes({
            availableNamespacesByTopic,
            checkedKeysSet,
            children: itemChildren,
            expandedKeys,
            saveConfig,
            setCurrentEditingTopic,
            settingsChangedKeysSet,
            width: titleWidth,
          })}
      </Tree.TreeNode>
    );
  });
}
