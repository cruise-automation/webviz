// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniq } from "lodash";
import React, { type Node } from "react";
import styled from "styled-components";

import renderNamespaceNodes, { type NamespaceNode } from "./renderNamespaceNodes";
import TreeNodeRow from "./TreeNodeRow";
import type {
  DerivedCustomSettingsByKey,
  GetIsNamespaceCheckedByDefault,
  GetIsTreeNodeVisibleInScene,
  GetIsTreeNodeVisibleInTree,
  NamespacesByTopic,
  SceneErrorsByKey,
  SetCurrentEditingTopic,
  ToggleNamespaceChecked,
  ToggleNode,
  ToggleNodeByColumn,
  TopicDisplayMode,
  TreeNode,
  TreeTopicNode,
} from "./types";
import { generateNodeKey } from "./useTopicTree";
import filterMap from "webviz-core/src/filterMap";
import { TOPIC_DISPLAY_MODES } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/TopicViewModeSelector";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import naturalSort from "webviz-core/src/util/naturalSort";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const SWITCHER_WIDTH = 24;

export const SToggles = styled.div`
  display: flex;
  align-items: center;
`;
export const SToggle = styled.div`
  width: 24px;
  height: 24px;
`;

const TooltipRow = styled.div`
  margin: 4px 0;
  &:first-child {
    margin-top: 0;
  }
  &:last-child {
    margin-bottom: 0;
  }
`;
const TooltipDescription = styled(TooltipRow)`
  line-height: 1.3;
  max-width: 300px;
`;

const TooltipTable = styled.table`
  th,
  td {
    border: none;
    padding: 0;
  }
  td {
    word-break: break-word;
  }
  max-width: 100%;
  th {
    color: ${colors.TEXT_MUTED};
  }
`;

type Props = {|
  availableNamespacesByTopic: NamespacesByTopic,
  checkedKeysSet: Set<string>,
  children: TreeNode[],
  derivedCustomSettingsByKey: DerivedCustomSettingsByKey,
  filterText: string,
  getIsNamespaceCheckedByDefault: GetIsNamespaceCheckedByDefault,
  getIsTreeNodeVisibleInScene: GetIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree: GetIsTreeNodeVisibleInTree,
  hasFeatureColumn: boolean,
  isXSWidth: boolean,
  sceneErrorsByKey: SceneErrorsByKey,
  setCurrentEditingTopic: SetCurrentEditingTopic,
  toggleCheckAllAncestors: ToggleNodeByColumn,
  toggleCheckAllDescendants: ToggleNodeByColumn,
  toggleNamespaceChecked: ToggleNamespaceChecked,
  toggleNodeChecked: ToggleNodeByColumn,
  toggleNodeExpanded: ToggleNode,
  topicDisplayMode: TopicDisplayMode,
  width: number,
|};

export type TreeUINode = {| title: Node, key: string, children?: TreeUINode[], disabled?: boolean |};

export function getNamespaceNodes({
  availableNamespacesByTopic,
  checkedKeysSet,
  getIsNamespaceCheckedByDefault,
  getIsTreeNodeVisibleInScene,
  hasFeatureColumn,
  node,
  showVisible,
}: {|
  availableNamespacesByTopic: NamespacesByTopic,
  checkedKeysSet: Set<string>,
  getIsNamespaceCheckedByDefault: GetIsNamespaceCheckedByDefault,
  getIsTreeNodeVisibleInScene: GetIsTreeNodeVisibleInScene,
  hasFeatureColumn: boolean,
  node: TreeTopicNode,
  showVisible: boolean,
|}): NamespaceNode[] {
  const topicName = node.topicName;
  const baseNamespacesSet = new Set((topicName && availableNamespacesByTopic[topicName]) || []);
  const featureNamespacesSet = new Set(
    (topicName && hasFeatureColumn && availableNamespacesByTopic[`${SECOND_SOURCE_PREFIX}${topicName}`]) || []
  );
  const uniqueNamespaces = uniq([...Array.from(baseNamespacesSet), ...Array.from(featureNamespacesSet)]);
  const columns = hasFeatureColumn ? [0, 1] : [0];
  return filterMap(uniqueNamespaces, (namespace) => {
    const namespaceKey = generateNodeKey({ topicName, namespace });
    const featureKey = generateNodeKey({ topicName, namespace, isFeatureColumn: true });
    const namespaceNode = {
      key: namespaceKey,
      featureKey,
      namespace,
      availableByColumn: columns.map((columnIdx) =>
        columnIdx === 1 ? featureNamespacesSet.has(namespace) : baseNamespacesSet.has(namespace)
      ),
      checkedByColumn: columns.map(
        (columnIdx) =>
          checkedKeysSet.has(columnIdx === 1 ? featureKey : namespaceKey) ||
          getIsNamespaceCheckedByDefault(topicName, columnIdx)
      ),
      visibleInSceneByColumn: columns.map((columnIdx) => getIsTreeNodeVisibleInScene(node, columnIdx, namespace)),
    };

    const visible = namespaceNode.visibleInSceneByColumn[0] || namespaceNode.visibleInSceneByColumn[1];
    // Don't render namespaces that are not visible when the user selected to view Visible only.
    if (node.providerAvailable && showVisible && !visible) {
      return undefined;
    }
    return namespaceNode;
  });
}

// A recursive function for generating tree nodes UI. Must use function instead of React component as the
// return signature is different from React component.
export default function renderTreeNodes({
  availableNamespacesByTopic,
  checkedKeysSet,
  children,
  derivedCustomSettingsByKey,
  filterText,
  getIsNamespaceCheckedByDefault,
  getIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree,
  hasFeatureColumn,
  isXSWidth,
  sceneErrorsByKey,
  setCurrentEditingTopic,
  toggleCheckAllAncestors,
  toggleCheckAllDescendants,
  toggleNamespaceChecked,
  toggleNodeChecked,
  toggleNodeExpanded,
  topicDisplayMode,
  width,
}: Props): TreeUINode[] {
  const titleWidth = width - SWITCHER_WIDTH;
  return children
    .filter(({ key }) => getIsTreeNodeVisibleInTree(key))
    .map((item) => {
      const { key, providerAvailable } = item;
      const visibleByColumn = hasFeatureColumn
        ? [getIsTreeNodeVisibleInScene(item, 0), getIsTreeNodeVisibleInScene(item, 1)]
        : [getIsTreeNodeVisibleInScene(item, 0)];

      const nodeVisibleInScene = !!(visibleByColumn[0] || visibleByColumn[1]);
      const nodeAvailable = item.availableByColumn[0] || item.availableByColumn[1];

      const showVisible = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_SELECTED.value;
      const showAvailable = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_AVAILABLE.value;

      // Render all nodes regardless of the displayMode when datasources are unavailable.
      if (providerAvailable && ((showVisible && !nodeVisibleInScene) || (showAvailable && !nodeAvailable))) {
        return null;
      }

      const itemChildren = item.type === "group" ? item.children : [];
      const topicName = item.type === "topic" ? item.topicName : "";

      const namespaceNodes =
        item.type === "topic"
          ? getNamespaceNodes({
              availableNamespacesByTopic,
              checkedKeysSet,
              getIsNamespaceCheckedByDefault,
              getIsTreeNodeVisibleInScene,
              hasFeatureColumn,
              node: item,
              showVisible,
            })
          : [];

      const tooltips = [];
      if (topicName) {
        tooltips.push(
          <TooltipRow key={tooltips.length}>
            <TooltipTable>
              <tbody>
                <tr>
                  <th>Topic:</th>
                  <td>
                    <tt>{topicName}</tt>
                  </td>
                </tr>
                {item.type === "topic" && item.datatype && (
                  <tr>
                    <th>Type:</th>
                    <td>
                      <tt>{item.datatype}</tt>
                    </td>
                  </tr>
                )}
              </tbody>
            </TooltipTable>
          </TooltipRow>
        );
      }
      if (item.description) {
        tooltips.push(<TooltipDescription key={tooltips.length}>{item.description}</TooltipDescription>);
      }

      const title = (
        <TreeNodeRow
          checkedKeysSet={checkedKeysSet}
          derivedCustomSettings={derivedCustomSettingsByKey[key]}
          filterText={filterText}
          hasChildren={itemChildren.length > 0 || namespaceNodes.length > 0}
          hasFeatureColumn={hasFeatureColumn}
          isXSWidth={isXSWidth}
          node={item}
          nodeVisibleInScene={nodeVisibleInScene}
          sceneErrors={sceneErrorsByKey[item.key]}
          setCurrentEditingTopic={setCurrentEditingTopic}
          toggleCheckAllAncestors={toggleCheckAllAncestors}
          toggleCheckAllDescendants={toggleCheckAllDescendants}
          toggleNodeChecked={toggleNodeChecked}
          toggleNodeExpanded={toggleNodeExpanded}
          visibleByColumn={visibleByColumn}
          width={titleWidth}
          {...(tooltips.length ? { tooltips } : undefined)}
        />
      );

      const childrenNodes = [];
      if (item.type === "topic" && namespaceNodes.length > 0) {
        childrenNodes.push(
          ...renderNamespaceNodes({
            children: namespaceNodes.sort(naturalSort("namespace")),
            getIsTreeNodeVisibleInScene,
            getIsTreeNodeVisibleInTree,
            hasFeatureColumn,
            isXSWidth,
            toggleCheckAllAncestors,
            toggleNamespaceChecked,
            topicNode: item,
            width: titleWidth,
            overrideColorByColumn:
              (derivedCustomSettingsByKey[key] && derivedCustomSettingsByKey[key].overrideColorByColumn) || [],
            filterText,
          })
        );
      }
      if (itemChildren) {
        childrenNodes.push(
          ...renderTreeNodes({
            availableNamespacesByTopic,
            checkedKeysSet,
            children: itemChildren,
            getIsTreeNodeVisibleInScene,
            getIsTreeNodeVisibleInTree,
            getIsNamespaceCheckedByDefault,
            hasFeatureColumn,
            isXSWidth,
            toggleCheckAllAncestors,
            toggleCheckAllDescendants,
            toggleNamespaceChecked,
            toggleNodeChecked,
            toggleNodeExpanded,
            topicDisplayMode,
            sceneErrorsByKey,
            setCurrentEditingTopic,
            derivedCustomSettingsByKey,
            width: titleWidth,
            filterText,
          })
        );
      }
      return {
        key,
        title,
        ...(childrenNodes.length ? { children: childrenNodes } : undefined),
        // Add `disabled` so that the switcher has the correct color.
        disabled: !nodeVisibleInScene,
      };
    })
    .filter(Boolean);
}
