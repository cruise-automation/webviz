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
import { TREE_SPACING } from "./TopicTree";
import { SToggles, STreeNodeRow, SLeft, SRightActions, ICON_SIZE, SDotMenuPlaceholder } from "./TreeNodeRow";
import type {
  ToggleNodeByColumn,
  TreeTopicNode,
  GetIsTreeNodeVisibleInScene,
  GetIsTreeNodeVisibleInTree,
  ToggleNamespaceChecked,
} from "./types";
import VisibilityToggle, { TOGGLE_WRAPPER_SIZE } from "./VisibilityToggle";

const OUTER_LEFT_MARGIN = 12;
const INNER_LEFT_MARGIN = 8;

export type NamespaceNode = {|
  availableByColumn: boolean[],
  checkedByColumn: boolean[],
  key: string,
  featureKey: string,
  namespace: string,
  visibleInSceneByColumn: boolean[],
|};

type Props = {|
  children: NamespaceNode[],
  getIsTreeNodeVisibleInScene: GetIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree: GetIsTreeNodeVisibleInTree,
  hasFeatureColumn: boolean,
  isXSWidth: boolean,
  overrideColorByColumn: (?string)[],
  toggleCheckAllAncestors: ToggleNodeByColumn,
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
  hasFeatureColumn,
  isXSWidth,
  overrideColorByColumn,
  toggleCheckAllAncestors,
  toggleNamespaceChecked,
  topicNode,
  width,
  filterText,
}: Props): TreeUINode[] {
  return children
    .filter(({ key }) => getIsTreeNodeVisibleInTree(key))
    .map(({ key, namespace, checkedByColumn, availableByColumn, visibleInSceneByColumn }) => {
      const nodeVisibleInScene = !!(visibleInSceneByColumn[0] || visibleInSceneByColumn[1]);
      const rowWidth = width - (isXSWidth ? 0 : TREE_SPACING * 2) - OUTER_LEFT_MARGIN;
      const topicNodeAvailable = topicNode.availableByColumn[0] || topicNode.availableByColumn[1];
      const togglesWidth = hasFeatureColumn ? TOGGLE_WRAPPER_SIZE * 2 : TOGGLE_WRAPPER_SIZE;
      const rightActionWidth = topicNodeAvailable ? togglesWidth + ICON_SIZE : ICON_SIZE;
      const maxNodeNameLen = rowWidth - rightActionWidth - INNER_LEFT_MARGIN * 2;

      // TODO(Audrey): remove the special tooltip once we add 2nd bag support for map and tf namespaces.
      const unavailableTooltip =
        topicNode.topicName === "/tf" || topicNode.topicName === "/metadata" ? "Unsupported" : "Unavailable";

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
            {topicNodeAvailable && (
              <SToggles>
                {availableByColumn.map((available, columnIndex) => (
                  <VisibilityToggle
                    available={available}
                    key={columnIndex}
                    dataTest={`visibility-toggle~${key}~column${columnIndex}`}
                    checked={checkedByColumn[columnIndex]}
                    onAltToggle={() => toggleCheckAllAncestors(key, columnIndex, topicNode.topicName)}
                    onToggle={() => toggleNamespaceChecked({ topicName: topicNode.topicName, namespace, columnIndex })}
                    overrideColor={overrideColorByColumn[columnIndex]}
                    unavailableTooltip={unavailableTooltip}
                    visibleInScene={!!visibleInSceneByColumn[columnIndex]}
                  />
                ))}
              </SToggles>
            )}
            <SDotMenuPlaceholder />
          </SRightActions>
        </STreeNodeRow>
      );
      return { key, title };
    });
}
