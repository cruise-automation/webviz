// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";

import { TopicTreeNode, getId } from "./treeBuilder";
import Tree, { type Node } from "webviz-core/src/components/Tree";
import type { Namespace } from "webviz-core/src/types/Messages";
import toggle from "webviz-core/src/util/toggle";

import type { Save3DConfig } from "..";

export type TopicSelectorTreeProps = {|
  checkedNodes: string[],
  expandedNodes: string[],
  modifiedNamespaceTopics: string[],
  namespaces: Namespace[],
  onEditClick: (e: SyntheticMouseEvent<HTMLElement>, topic: string) => void,
  saveConfig: Save3DConfig,
  tree: TopicTreeNode,
|};

export default function TopicSelectorTree({
  checkedNodes,
  expandedNodes,
  modifiedNamespaceTopics,
  namespaces,
  onEditClick,
  saveConfig,
  tree,
}: TopicSelectorTreeProps) {
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

  return (
    <Tree
      hideRoot
      onToggleCheck={toggleChecked}
      onToggleExpand={toggleExpanded}
      onEditClick={onEditClickLocal}
      root={tree}
    />
  );
}
