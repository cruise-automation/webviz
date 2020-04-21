// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { difference, keyBy, mapValues } from "lodash";
import { useMemo } from "react";

import type { TreeNode, TopicV2Config, UseTreeInput, UseTreeOutput } from "./types";
import filterMap from "webviz-core/src/filterMap";
import { useShallowMemo } from "webviz-core/src/util/hooks";

const UNCATEGORIZED_NAME = "(Uncategorized)";

// TODO(Audrey): opaque type for node keys: https://flow.org/en/docs/types/opaque-types/
function generateNodeKey({ topicName, name }: {| topicName?: ?string, name?: ?string |}): string {
  if (topicName) {
    return `t:${topicName}`;
  }
  if (name) {
    return `name:${name}`;
  }

  throw new Error(`Incorrect input for generating the node key. Either topicName or name must be present.`);
}

// Recursive function to generate the tree nodes from config data.
export function generateTreeNode(
  { children = [], topicName, name }: TopicV2Config,
  { parentKey, datatypesByTopic }: {| parentKey: ?string, datatypesByTopic: { [topicName: string]: string } |}
): TreeNode {
  const key = generateNodeKey({ name, topicName });
  if (topicName) {
    const datatype = datatypesByTopic[topicName];
    return {
      type: "topic",
      key,
      topicName,
      ...(parentKey ? { parentKey } : undefined),
      ...(name ? { name } : undefined),
      ...(datatype ? { datatype } : undefined),
    };
  }
  if (name) {
    return {
      key,
      name,
      type: "group",
      // First level children's parent key is undefined, not `root`.
      children: children.map((config) =>
        generateTreeNode(config, { parentKey: name === "root" ? undefined : key, datatypesByTopic })
      ),
      ...(parentKey ? { parentKey } : undefined),
    };
  }
  throw new Error(`Incorrect topic tree config. Either topicName or name must be present.`);
}

function* flattenNode<T: TreeNode | TopicV2Config>(node: T): Generator<T, void, void> {
  yield node;
  if (node.children) {
    for (const subNode of node.children) {
      yield* flattenNode(subNode);
    }
  }
}

export default function useTree({
  checkedKeys,
  modifiedNamespaceTopics,
  providerTopics,
  topicSettings,
  topicTreeConfig,
}: UseTreeInput): UseTreeOutput {
  const topicTreeTopics = useMemo(
    () =>
      Array.from(flattenNode(topicTreeConfig))
        .map((node) => (node.topicName && !node.namespace ? node.topicName : undefined))
        .filter(Boolean),
    [topicTreeConfig]
  );

  const rootTreeNode = useMemo(
    (): TreeNode => {
      // Precompute uncategorized topics to add to the transformedTreeConfig before generating the TreeNodes.
      const availableTopicNames = providerTopics.map((topic) => topic.name);
      const uncategorizedTopicNames = difference(availableTopicNames, topicTreeTopics);
      const datatypesByTopic = mapValues(keyBy(providerTopics, "name"), (item) => item.datatype);

      const newChildren = [...(topicTreeConfig.children || [])];
      if (uncategorizedTopicNames.length) {
        // Add uncategorized group node to root config.
        newChildren.push({
          name: UNCATEGORIZED_NAME,
          children: uncategorizedTopicNames.map((topicName) => ({ topicName })),
        });
      }
      // Generate the rootTreeNode. Don't mutate the original treeConfig, just make a copy with newChildren.
      return generateTreeNode(
        { ...topicTreeConfig, children: newChildren },
        { parentKey: undefined, datatypesByTopic }
      );
    },
    [providerTopics, topicTreeConfig, topicTreeTopics]
  );

  const nodesByKey = useMemo(
    () => {
      const flattenNodes = Array.from(flattenNode(rootTreeNode));
      return keyBy(flattenNodes, "key");
    },
    [rootTreeNode]
  );

  const selections = useMemo(
    () => {
      // Memoize node selections for extracting topic/namespace selections and checking node's visibility state.
      const isSelectedMemo: { [string]: boolean } = {};

      const checkedKeysSet = new Set(checkedKeys);
      function isSelected(key: ?string): boolean {
        if (!key) {
          return true;
        }
        if (isSelectedMemo[key] === undefined) {
          const node = nodesByKey[key];
          isSelectedMemo[key] = checkedKeysSet.has(key) && node && isSelected(node.parentKey);
        }
        return isSelectedMemo[key];
      }

      const selectedTopicNamesSet = new Set(
        filterMap(checkedKeys, (key) => {
          if (!key.startsWith("t:") || !isSelected(key)) {
            return;
          }
          return key.substr("t:".length);
        })
      );

      // TODO(Audrey): make modifiedNamespaceTopics work as before.
      const selectedNamespacesByTopic = (modifiedNamespaceTopics || []).reduce(
        (memo, topicName) => ({ ...memo, [topicName]: [] }),
        {}
      );

      // Go through the checked namespace keys, split the key to topicName + namespace, and
      // collect the namespaces if the topic is selected.
      checkedKeys.forEach((key) => {
        if (!key.startsWith("ns:")) {
          return;
        }
        const [_, topicName, namespace] = key.split(":");
        if (!topicName || !namespace) {
          throw new Error(`Incorrect checkedNode in panelConfig: ${key}`);
        }
        if (selectedTopicNamesSet.has(topicName)) {
          if (!selectedNamespacesByTopic[topicName]) {
            selectedNamespacesByTopic[topicName] = [];
          }
          selectedNamespacesByTopic[topicName].push(namespace);
        }
      });
      return { selectedTopicNames: Array.from(selectedTopicNamesSet), selectedNamespacesByTopic };
    },
    [checkedKeys, modifiedNamespaceTopics, nodesByKey]
  );

  // Memoize topic names to prevent subscription update when expanding/collapsing nodes.
  const memoizedSelectedTopicNames = useShallowMemo(selections.selectedTopicNames);

  const settingsChangedKeysSet = useMemo(
    () =>
      new Set(
        Object.keys(topicSettings)
          .map((topicName) => generateNodeKey({ topicName }))
          .filter((key) => nodesByKey[key])
      ),
    [nodesByKey, topicSettings]
  );

  // TODO(Audrey): change to `/webviz_source_2`
  const hasFeatureColumn = useMemo(() => providerTopics.some(({ name }) => name.startsWith("/webviz_bag_2")), [
    providerTopics,
  ]);

  return {
    rootTreeNode,
    selectedTopicNames: memoizedSelectedTopicNames,
    selectedNamespacesByTopic: selections.selectedNamespacesByTopic,
    settingsChangedKeysSet,
    hasFeatureColumn,
  };
}
