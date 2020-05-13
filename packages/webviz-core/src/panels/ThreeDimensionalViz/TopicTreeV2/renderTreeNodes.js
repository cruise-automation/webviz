// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

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
  TopicDisplayMode,
  TreeNode,
} from "./types";
import { generateNodeKey } from "./useTopicTree";
import filterMap from "webviz-core/src/filterMap";
import { TOPIC_DISPLAY_MODES } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/TopicDisplayModeSelector";
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
  isXSWidth: boolean,
  sceneErrorsByKey: SceneErrorsByKey,
  setCurrentEditingTopic: SetCurrentEditingTopic,
  toggleCheckAllAncestors: ToggleNode,
  toggleCheckAllDescendants: ToggleNode,
  toggleNamespaceChecked: ToggleNamespaceChecked,
  toggleNodeChecked: ToggleNode,
  toggleNodeExpanded: ToggleNode,
  topicDisplayMode: TopicDisplayMode,
  width: number,
|};

export type TreeUINode = {| title: Node, key: string, children?: TreeUINode[], disabled?: boolean |};

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
    .filter((item) => getIsTreeNodeVisibleInTree(item.key))
    .map((item) => {
      const { key, providerAvailable } = item;
      const nodeVisibleInScene = getIsTreeNodeVisibleInScene(item);

      const showVisible = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_SELECTED.value;
      const showAvailable = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_AVAILABLE.value;
      // Render all nodes regardless of the displayMode when datasources are unavailable.
      if (providerAvailable && ((showVisible && !nodeVisibleInScene) || (showAvailable && !item.available))) {
        return null;
      }

      const itemChildren = item.type === "group" ? item.children : [];
      const topicName = item.type === "topic" ? item.topicName : "";

      const availableNamespaces = (topicName && availableNamespacesByTopic[topicName]) || [];
      const namespaceNodes: NamespaceNode[] = filterMap(availableNamespaces, (namespace) => {
        const namespaceKey = generateNodeKey({ topicName, namespace });
        const visible = checkedKeysSet.has(namespaceKey) || getIsNamespaceCheckedByDefault(topicName);
        // Don't render namespaces that are not visible when the user selected to view Visible only.
        if (providerAvailable && showVisible && !visible) {
          return undefined;
        }
        return {
          key: namespaceKey,
          namespace,
          checked: visible,
        };
      });

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
          node={item}
          nodeVisibleInScene={nodeVisibleInScene}
          hasChildren={itemChildren.length > 0 || namespaceNodes.length > 0}
          isXSWidth={isXSWidth}
          toggleCheckAllAncestors={toggleCheckAllAncestors}
          toggleCheckAllDescendants={toggleCheckAllDescendants}
          toggleNodeChecked={toggleNodeChecked}
          toggleNodeExpanded={toggleNodeExpanded}
          sceneErrors={sceneErrorsByKey[item.key]}
          setCurrentEditingTopic={setCurrentEditingTopic}
          derivedCustomSettings={derivedCustomSettingsByKey[key]}
          width={titleWidth}
          filterText={filterText}
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
            isXSWidth,
            toggleCheckAllAncestors,
            toggleNamespaceChecked,
            topicNode: item,
            width: titleWidth,
            overrideColor: derivedCustomSettingsByKey[key] && derivedCustomSettingsByKey[key].overrideColor,
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
