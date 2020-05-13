// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import NodeName from "./NodeName";
import { type TreeUINode } from "./renderTreeNodes";
import { TREE_SPACING } from "./TopicTreeV2";
import { SToggles, STreeNodeRow, SLeft, SRightActions, ICON_SIZE, SDotMenuPlaceholder } from "./TreeNodeRow";
import type {
  ToggleNode,
  TreeTopicNode,
  GetIsTreeNodeVisibleInScene,
  GetIsTreeNodeVisibleInTree,
  ToggleNamespaceChecked,
} from "./types";
import VisibilityToggle, { TOGGLE_WRAPPER_SIZE } from "./VisibilityToggle";

const OUTER_LEFT_MARGIN = 12;
const INNER_LEFT_MARGIN = 8;

export type NamespaceNode = {|
  checked: boolean,
  key: string,
  namespace: string,
|};

type Props = {|
  children: NamespaceNode[],
  getIsTreeNodeVisibleInScene: GetIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree: GetIsTreeNodeVisibleInTree,
  isXSWidth: boolean,
  overrideColor: ?string,
  toggleCheckAllAncestors: ToggleNode,
  toggleNamespaceChecked: ToggleNamespaceChecked,
  topicNode: TreeTopicNode,
  width: number,
  filterText: string,
|};

// Must use function instead of React component as Tree/TreeNode can only accept TreeNode as children.
export default function renderNamespaceNodes({
  children,
  getIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree,
  isXSWidth,
  overrideColor,
  toggleCheckAllAncestors,
  toggleNamespaceChecked,
  topicNode,
  width,
  filterText,
}: Props): TreeUINode[] {
  return children
    .filter(({ key }) => getIsTreeNodeVisibleInTree(key))
    .map(({ key, namespace, checked }) => {
      const nodeVisibleInScene = getIsTreeNodeVisibleInScene(topicNode, key);
      const rowWidth = width - (isXSWidth ? 0 : TREE_SPACING * 2) - OUTER_LEFT_MARGIN;
      const rightActionWidth = topicNode.available ? TOGGLE_WRAPPER_SIZE + ICON_SIZE : ICON_SIZE;
      const maxNodeNameLen = rowWidth - rightActionWidth - INNER_LEFT_MARGIN * 2;

      const title = (
        <STreeNodeRow
          visibleInScene={nodeVisibleInScene}
          style={{
            width: rowWidth,
            marginLeft: `-${OUTER_LEFT_MARGIN}px`,
          }}>
          <SLeft>
            <NodeName
              isXSWidth={isXSWidth}
              maxWidth={maxNodeNameLen}
              displayName={namespace}
              topicName={""}
              searchText={filterText}
            />
          </SLeft>
          <SRightActions>
            {topicNode.available && (
              <SToggles>
                <VisibilityToggle
                  dataTest={`visibility-toggle~${key}`}
                  checked={checked}
                  onAltToggle={() => toggleCheckAllAncestors(key, topicNode.topicName)}
                  onToggle={() => toggleNamespaceChecked({ topicName: topicNode.topicName, namespaceKey: key })}
                  overrideColor={overrideColor}
                  visibleInScene={nodeVisibleInScene}
                />
              </SToggles>
            )}
            <SDotMenuPlaceholder />
          </SRightActions>
        </STreeNodeRow>
      );
      return { key, title };
    });
}
