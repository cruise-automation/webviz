// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";
import styled from "styled-components";

import { TopicTreeNode, getId } from "./treeBuilder";
import Tree, { type Node } from "webviz-core/src/components/Tree";
import { setVisibleByHiddenTopics } from "webviz-core/src/panels/ThreeDimensionalViz/topicTreeUtils";
import type { Namespace } from "webviz-core/src/types/Messages";
import { colors } from "webviz-core/src/util/colors";
import toggle from "webviz-core/src/util/toggle";

import type { Save3DConfig } from "..";

const SMutedText = styled.div`
  color: ${colors.GRAY};
  line-height: 1.4;
  margin: 8px 12px;
`;
export type TopicSelectorFlatListProps = {|
  checkedNodes: string[],
  disableCheckbox?: boolean,
  expandedNodes: string[],
  modifiedNamespaceTopics: string[],
  namespaces: Namespace[],
  onEditClick: (e: SyntheticMouseEvent<HTMLElement>, topic: string) => void,
  saveConfig: Save3DConfig,
  tree: TopicTreeNode,
  hiddenTopics: string[],
  setHiddenTopics: ((prevTopics: string[]) => string[]) => void,
|};

export default function TopicSelectorFlatList({
  checkedNodes,
  disableCheckbox,
  expandedNodes,
  modifiedNamespaceTopics,
  namespaces,
  onEditClick,
  saveConfig,
  tree,
  hiddenTopics,
  setHiddenTopics,
}: TopicSelectorFlatListProps) {
  // update the topic visibility based on hiddenTopics
  React.useMemo(() => setVisibleByHiddenTopics(tree, hiddenTopics), [hiddenTopics, tree]);

  const toggleExpanded = useCallback(
    ({ legacyIds, id }: Node) => {
      // don't invalidate layout url just because a node was expanded/collapsed
      saveConfig(
        { expandedNodes: toggle(expandedNodes, id, (item) => legacyIds.includes(item) || item === id) },
        { keepLayoutInUrl: true }
      );
    },
    [expandedNodes, saveConfig]
  );

  const onEditClickLocal = useCallback(
    (e: SyntheticMouseEvent<HTMLElement>, node: Node) => {
      const { topic }: TopicTreeNode = ((node: Node): TopicTreeNode);
      if (!topic) {
        return;
      }
      onEditClick(e, topic);
    },
    [onEditClick]
  );

  const toggleChecked = useCallback(
    (node: Node) => {
      const { namespace, topic, legacyIds, id } = ((node: Node): TopicTreeNode);
      // If we are interacting with a namespace, mark its topic as modified.
      // This helps us avoid re-checking topics when new namespaces show up (on app load).
      if (namespace && topic && !modifiedNamespaceTopics.includes(topic)) {
        // check all namespaces under this topic *except* the clicked one
        const newCheckedNodes = checkedNodes.slice();
        namespaces.forEach((ns) => {
          if (ns.topic === topic && ns.name !== namespace) {
            newCheckedNodes.push(getId(ns));
          }
        });
        saveConfig({
          modifiedNamespaceTopics: modifiedNamespaceTopics.concat(topic),
          checkedNodes: newCheckedNodes,
        });
      } else {
        saveConfig({ checkedNodes: toggle(checkedNodes, id, (item) => legacyIds.includes(item) || item === id) });
      }
    },
    [checkedNodes, modifiedNamespaceTopics, namespaces, saveConfig]
  );

  const onRemoveNode = useCallback(
    (node: Node) => {
      const { namespace, topic, legacyIds, id } = ((node: Node): TopicTreeNode);
      if (topic && namespace) {
        console.error("Removing namespace nodes is not yet supported");
        return;
      }
      saveConfig({ checkedNodes: toggle(checkedNodes, id, (item) => legacyIds.includes(item) || item === id) });
    },
    [checkedNodes, saveConfig]
  );

  const toggleVisibility = useCallback(
    (node: Node) => {
      const { topic, visible } = ((node: Node): TopicTreeNode);
      if (!topic) {
        console.error("Toggling on non-topic tree nodes is not yet supported");
        return;
      }
      setHiddenTopics((prevHiddenTopics) =>
        visible ? prevHiddenTopics.concat(topic) : prevHiddenTopics.filter((t) => t !== topic)
      );
    },
    //eslint-disable-next-line react-hooks/exhaustive-deps, callback needs to be updated when hiddenTopics changes
    [setHiddenTopics, hiddenTopics]
  );

  return (
    <>
      <SMutedText>This flat topic tree is an experimental feature under active development.</SMutedText>
      <Tree
        disableCheckbox={disableCheckbox}
        enableVisibilityToggle
        hideRoot
        onEditClick={onEditClickLocal}
        onRemoveNode={onRemoveNode}
        onToggleCheck={toggleChecked}
        onToggleExpand={toggleExpanded}
        onToggleVisibility={toggleVisibility}
        root={tree}
      />
    </>
  );
}
