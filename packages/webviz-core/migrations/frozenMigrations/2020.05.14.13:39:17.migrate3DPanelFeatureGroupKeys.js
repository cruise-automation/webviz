// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { keyBy, uniq } from "lodash";

import {
  migrate3DPanelSavedProps,
  TOPIC_CONFIG,
  type TopicTreeConfig,
} from "webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel";

export type TreeGroupNode = {|
  type: "group",
  name: string,
  key: string,
  featureKey: string,
  parentKey?: string,
  availableByColumn: boolean[],
  // Whether the data providers are available. If it is and the current node is not available, we'll show
  // the node name being striked through in the UI.
  providerAvailable: boolean,
  // eslint-disable-next-line
  children: TreeNode[],
|};

export type TreeTopicNode = {|
  type: "topic",
  topicName: string,
  key: string,
  featureKey: string,
  parentKey?: string,
  name?: string,
  datatype?: string,
  description?: string,
  providerAvailable: boolean,
  availableByColumn: boolean[],
|};

export type TreeNode = TreeGroupNode | TreeTopicNode;

const UNCATEGORIZED_KEY = "name:(Uncategorized)";
const $WEBVIZ_SOURCE_2 = "/webviz_source_2";

function generateNodeKey({
  topicName,
  name,
  namespace,
  isFeatureColumn,
}: {|
  topicName?: ?string,
  name?: ?string,
  namespace?: ?string,
  isFeatureColumn?: boolean,
|}): string {
  const prefixedTopicName = topicName ? (isFeatureColumn ? `${$WEBVIZ_SOURCE_2}${topicName}` : topicName) : undefined;
  if (namespace) {
    if (prefixedTopicName) {
      return `ns:${prefixedTopicName}:${namespace}`;
    }
    throw new Error(
      "Incorrect input for generating the node key. If a namespace is present, then the topicName must be present"
    );
  }
  if (prefixedTopicName) {
    return `t:${prefixedTopicName}`;
  }
  if (name) {
    return isFeatureColumn ? `name_2:${name}` : `name:${name}`;
  }

  throw new Error(`Incorrect input for generating the node key. Either topicName or name must be present.`);
}

// Recursive function to generate the tree nodes from config data.
export function generateTreeNode(
  { children = [], topicName, name, description }: TopicTreeConfig,
  {
    availableTopicsNamesSet,
    parentKey,
    datatypesByTopic,
    hasFeatureColumn,
  }: {|
    availableTopicsNamesSet: Set<string>,
    datatypesByTopic: { [topicName: string]: string },
    parentKey: ?string,
    hasFeatureColumn: boolean,
  |}
): TreeNode {
  const key = generateNodeKey({ name, topicName });
  const featureKey = generateNodeKey({ name, topicName, isFeatureColumn: true });
  const providerAvailable = availableTopicsNamesSet.size > 0;

  if (topicName) {
    const datatype = datatypesByTopic[topicName];
    return {
      type: "topic",
      key,
      featureKey,
      topicName,
      availableByColumn: hasFeatureColumn
        ? [availableTopicsNamesSet.has(topicName), availableTopicsNamesSet.has(`${$WEBVIZ_SOURCE_2}${topicName}`)]
        : [availableTopicsNamesSet.has(topicName)],
      providerAvailable,
      ...(parentKey ? { parentKey } : undefined),
      ...(name ? { name } : undefined),
      ...(datatype ? { datatype } : undefined),
      ...(description ? { description } : undefined),
    };
  }
  if (name) {
    const childrenNodes = children.map((config) =>
      generateTreeNode(config, {
        availableTopicsNamesSet,
        // First level children's parent key is undefined, not `root`.
        parentKey: name === "root" ? undefined : key,
        datatypesByTopic,
        hasFeatureColumn,
      })
    );
    return {
      key,
      featureKey,
      name,
      type: "group",
      // A group node is available when some children nodes are available.
      availableByColumn: hasFeatureColumn
        ? [
            childrenNodes.some((node) => node.availableByColumn[0]),
            childrenNodes.some((node) => node.availableByColumn[1]),
          ]
        : [childrenNodes.some((node) => node.availableByColumn[0])],
      providerAvailable,
      children: childrenNodes,
      ...(parentKey ? { parentKey } : undefined),
    };
  }
  throw new Error(`Incorrect topic tree config. Either topicName or name must be present.`);
}

export function* flattenNode<T: TreeNode | TopicTreeConfig>(node: T): Generator<T, void, void> {
  yield node;
  if (node.children) {
    for (const subNode of node.children) {
      yield* flattenNode(subNode);
    }
  }
}

export function migrateToFeatureGroupCheckedKeys(checkedKeys: string[], topicTreeConfig: TopicTreeConfig): string[] {
  const hasUncategorizedKey = checkedKeys.includes(UNCATEGORIZED_KEY);
  if (!hasUncategorizedKey) {
    return checkedKeys;
  }
  // Find checked feature topics and add their ancestor nodes to the newCheckedKeys.
  const newCheckedKeys = [...checkedKeys];
  const checkedFeatureTopicKeys = checkedKeys
    .map((key) => (key.includes($WEBVIZ_SOURCE_2) ? key.replace($WEBVIZ_SOURCE_2, "") : undefined))
    .filter(Boolean);

  const rootTreeNode = generateTreeNode(topicTreeConfig, {
    availableTopicsNamesSet: new Set(),
    datatypesByTopic: {},
    hasFeatureColumn: true,
    parentKey: undefined,
  });

  const flattenNodes = Array.from(flattenNode(rootTreeNode));
  const nodesByKey = keyBy(flattenNodes, "key");

  let addedUncategorizedFeatureKey = false;

  checkedFeatureTopicKeys.forEach((topicKey) => {
    const node = nodesByKey[topicKey];
    if (!node) {
      if (!addedUncategorizedFeatureKey) {
        // Check uncategorized feature column for uncategorized feature topics.
        newCheckedKeys.push("name_2:(Uncategorized)");
        addedUncategorizedFeatureKey = true;
      }
      return;
    }
    let parentKey = node.parentKey;
    while (parentKey) {
      if (nodesByKey[parentKey]) {
        newCheckedKeys.push(nodesByKey[parentKey].featureKey);
      }
      parentKey = nodesByKey[parentKey]?.parentKey;
    }
  });

  return uniq(newCheckedKeys);
}

export function migrate3DPanelFeatureGroupKeys(config: any, topicTreeConfig: ?TopicTreeConfig): any {
  return {
    ...config,
    checkedKeys: migrateToFeatureGroupCheckedKeys([...config.checkedKeys], topicTreeConfig || TOPIC_CONFIG),
  };
}

export default migrate3DPanelSavedProps(migrate3DPanelFeatureGroupKeys);
