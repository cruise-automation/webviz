// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { difference, keyBy, uniq, mapValues, xor, isEqual, flatten } from "lodash";
import { useMemo, useCallback, useRef } from "react";
import tinyColor from "tinycolor2";
import { useDebounce } from "use-debounce";

import type { TreeNode, TopicV2Config, UseTreeInput, UseTreeOutput, DerivedCustomSettingsByKey } from "./types";
import filterMap from "webviz-core/src/filterMap";
import { parseColorSetting } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/TopicSettingsEditor";
import { TOPIC_DISPLAY_MODES } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTreeV2/TopicViewModeSelector";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import { useShallowMemo } from "webviz-core/src/util/hooks";

const UNCATEGORIZED_NAME = "(Uncategorized)";

// TODO(Audrey): opaque type for node keys: https://flow.org/en/docs/types/opaque-types/
export function generateNodeKey({
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
  const prefixedTopicName = topicName
    ? isFeatureColumn
      ? `${SECOND_SOURCE_PREFIX}${topicName}`
      : topicName
    : undefined;
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
  { children = [], topicName, name, description }: TopicV2Config,
  {
    availableTopicsNamesSet,
    parentKey,
    datatypesByTopic,
  }: {|
    availableTopicsNamesSet: Set<string>,
    datatypesByTopic: { [topicName: string]: string },
    parentKey: ?string,
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
      available: availableTopicsNamesSet.has(topicName),
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
      })
    );
    return {
      key,
      featureKey,
      name,
      type: "group",
      // A group node is available when some children nodes are available.
      available: childrenNodes.some((node) => node.available),
      providerAvailable,
      children: childrenNodes,
      ...(parentKey ? { parentKey } : undefined),
    };
  }
  throw new Error(`Incorrect topic tree config. Either topicName or name must be present.`);
}

export function* flattenNode<T: TreeNode | TopicV2Config>(node: T): Generator<T, void, void> {
  yield node;
  if (node.children) {
    for (const subNode of node.children) {
      yield* flattenNode(subNode);
    }
  }
}

export default function useTree({
  availableNamespacesByTopic,
  checkedKeys,
  defaultTopicSettings,
  expandedKeys,
  filterText,
  modifiedNamespaceTopics,
  providerTopics,
  saveConfig,
  sceneErrorsByTopicKey,
  topicDisplayMode,
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
      const availableTopicsNamesSet = new Set(providerTopics.map((topic) => topic.name));

      // Precompute uncategorized topics to add to the transformedTreeConfig before generating the TreeNodes.
      const uncategorizedTopicNames = difference(Array.from(availableTopicsNamesSet), topicTreeTopics);
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
        { parentKey: undefined, datatypesByTopic, availableTopicsNamesSet }
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
      const checkedKeysSet = new Set(checkedKeys);
      // Memoize node selections for extracting topic/namespace selections and checking node's visibility state.
      const isSelectedMemo: { [string]: boolean } = {};

      // Check if a node is selected and fill in the isSelectedMemo cache for future access.
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

      // Add namespace selections if a topic has any namespaces modified. Any topics that don't have
      // the namespaces set in selectedNamespacesByTopic will have the namespaces turned on by default.
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

      // Returns whether a node/namespace is rendered in the 3d scene. Keep it inside useMemo since it needs to acces the same isSelectedMemo.
      // A node is visible if it's available, itself and all ancestor nodes are selected.
      function getIsTreeNodeVisibleInScene(node: TreeNode, namespaceKey?: string): boolean {
        if (namespaceKey) {
          // Namespace nodes are checked by default if there are no selected namespaces under the topic.
          const namespaceChecked =
            checkedKeysSet.has(namespaceKey) || (node.type === "topic" && !selectedNamespacesByTopic[node.topicName]);
          return namespaceChecked && node.available && isSelected(node.key);
        }
        return node.available && isSelected(node.key);
      }
      return {
        selectedTopicNames: Array.from(selectedTopicNamesSet),
        selectedNamespacesByTopic,
        getIsTreeNodeVisibleInScene,
      };
    },
    [checkedKeys, modifiedNamespaceTopics, nodesByKey]
  );

  const { selectedTopicNames, selectedNamespacesByTopic, getIsTreeNodeVisibleInScene } = selections;

  // Memoize topic names to prevent subscription update when expanding/collapsing nodes.
  const memoizedSelectedTopicNames = useShallowMemo(selectedTopicNames);

  const derivedCustomSettingsByKey = useMemo(
    (): DerivedCustomSettingsByKey => {
      const result = {};
      for (const [topicName, settings] of Object.entries(topicSettings)) {
        const key = generateNodeKey({ topicName });

        result[key] = { isDefaultSettings: false };
        // If any topic has default settings, compare settings with default settings to determine if settings has changed.
        if (defaultTopicSettings[topicName]) {
          result[key].isDefaultSettings = isEqual(settings, defaultTopicSettings[topicName]);
        }
        // $FlowFixMe some settings have overideColor field
        if (settings.overrideColor) {
          const rgba = parseColorSetting(settings.overrideColor);
          result[key].overrideColor = tinyColor.fromRatio(rgba).toRgbString();
        }
      }
      return result;
    },
    [defaultTopicSettings, topicSettings]
  );

  const hasFeatureColumn = useMemo(() => providerTopics.some(({ name }) => name.startsWith("/webviz_source_2")), [
    providerTopics,
  ]);

  // A namespace is checked by default if none of the namespaces are in the checkedKeys (selected) and the parent topic is checked.
  const getIsNamespaceCheckedByDefault = useCallback(
    (topicName: string) =>
      !selectedNamespacesByTopic[topicName] && checkedKeys.includes(generateNodeKey({ topicName })),
    [checkedKeys, selectedNamespacesByTopic]
  );

  const toggleNamespaceChecked = useCallback(
    ({ topicName, namespaceKey }: {| topicName: string, namespaceKey: string |}) => {
      const isNamespaceCheckedByDefault = getIsNamespaceCheckedByDefault(topicName);
      let newCheckedKeys;
      if (isNamespaceCheckedByDefault) {
        // Add all other namespaces under the topic to the checked keys.
        const allNsKeys = (availableNamespacesByTopic[topicName] || []).map((namespace) =>
          generateNodeKey({ topicName, namespace })
        );
        const otherNamespaceKeys = difference(allNsKeys, [namespaceKey]);
        newCheckedKeys = [...checkedKeys, ...otherNamespaceKeys];
      } else {
        newCheckedKeys = xor(checkedKeys, [namespaceKey]);
      }

      saveConfig({
        checkedKeys: newCheckedKeys,
        modifiedNamespaceTopics: uniq([...modifiedNamespaceTopics, topicName]),
      });
    },
    [availableNamespacesByTopic, checkedKeys, getIsNamespaceCheckedByDefault, modifiedNamespaceTopics, saveConfig]
  );

  const toggleNodeChecked = useCallback(
    (nodeKey: string) => {
      saveConfig({ checkedKeys: xor(checkedKeys, [nodeKey]) });
    },
    [checkedKeys, saveConfig]
  );

  const toggleCheckAllDescendants = useCallback(
    (nodeKey: string) => {
      const node = nodesByKey[nodeKey];
      const isNowChecked = !checkedKeys.includes(nodeKey);
      const nodeAndChildren = Array.from(flattenNode(node));
      const nodeAndChildrenKeys = nodeAndChildren.map((item) => item.key);
      const topicNames = nodeAndChildren.map((item) => (item.type === "topic" ? item.topicName : null)).filter(Boolean);
      const namespaceChildrenKeys = flatten(
        topicNames.map((topicName) =>
          (availableNamespacesByTopic[topicName] || []).map((namespace) => generateNodeKey({ topicName, namespace }))
        )
      );
      const nodeKeysToToggle = [...nodeAndChildrenKeys, ...namespaceChildrenKeys];
      // Toggle all children nodes' checked state to be the same as the new checked state for the node.
      saveConfig({
        checkedKeys: isNowChecked
          ? uniq([...checkedKeys, ...nodeKeysToToggle])
          : difference(checkedKeys, nodeKeysToToggle),
      });
    },
    [availableNamespacesByTopic, checkedKeys, nodesByKey, saveConfig]
  );

  const toggleCheckAllAncestors = useCallback(
    (nodeKey: string, namespaceParentTopicName?: string) => {
      const node = nodesByKey[nodeKey];
      let prevChecked = checkedKeys.includes(nodeKey);
      if (!prevChecked && namespaceParentTopicName) {
        prevChecked = getIsNamespaceCheckedByDefault(namespaceParentTopicName);
      }
      const isNowChecked = !prevChecked;

      const nodeAndAncestorKeys = [nodeKey];
      let parentKey = namespaceParentTopicName
        ? generateNodeKey({ topicName: namespaceParentTopicName })
        : node?.parentKey;
      while (parentKey) {
        nodeAndAncestorKeys.push(parentKey);
        parentKey = nodesByKey[parentKey]?.parentKey;
      }
      // Toggle all ancestor nodes' checked state to be the same as the new checked state for the node.
      saveConfig({
        checkedKeys: isNowChecked
          ? uniq([...checkedKeys, ...nodeAndAncestorKeys])
          : difference(checkedKeys, nodeAndAncestorKeys),
      });
    },
    [checkedKeys, getIsNamespaceCheckedByDefault, nodesByKey, saveConfig]
  );

  const filterTextRef = useRef(filterText);
  filterTextRef.current = filterText;
  const toggleNodeExpanded = useCallback(
    (nodeKey: string) => {
      // Don't allow any toggling expansion when filtering because we automatically expand all nodes.
      if (!filterTextRef.current) {
        saveConfig({ expandedKeys: xor(expandedKeys, [nodeKey]) }, { keepLayoutInUrl: true });
      }
    },
    [expandedKeys, saveConfig]
  );

  const sceneErrorsByKey = useMemo(
    () => {
      const result = { ...sceneErrorsByTopicKey };

      function collectGroupErrors(groupKey: ?string, errors: string[]) {
        let nodeKey: ?string = groupKey;
        while (nodeKey && nodesByKey[nodeKey]) {
          if (!result[nodeKey]) {
            result[nodeKey] = [];
          }
          result[nodeKey].push(...errors);
          nodeKey = nodesByKey[nodeKey].parentKey;
        }
      }

      for (const [topicKey, errors] of Object.entries(sceneErrorsByTopicKey)) {
        const topicNode = nodesByKey[topicKey];
        // $FlowFixMe `errors` type is string[]
        collectGroupErrors(topicNode?.parentKey, errors.map((err) => `${topicKey.substr("t:".length)}: ${err}`));
      }

      return result;
    },
    [nodesByKey, sceneErrorsByTopicKey]
  );

  const [debouncedFilterText] = useDebounce(filterText, 150);
  const { getIsTreeNodeVisibleInTree } = useMemo(
    () => {
      const showVisible = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_SELECTED.value;
      const showAvailable = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_AVAILABLE.value;
      const providerAvailable = providerTopics.length > 0;

      let hasCalculatedVisibility = false;
      // This stores whether the row has been marked as visible, so that we don't do extra work.
      const isVisibleByKey: { [string]: boolean } = {};

      const searchText = debouncedFilterText.toLowerCase().trim();
      function getIfTextMatches(node: TreeNode): boolean {
        // Never match the root node.
        if (node.name === "root") {
          return false;
        } else if (node.type === "group") {
          // Group node
          return node.name != null && node.name.toLowerCase().includes(searchText);
        }
        // Topic node, without namespace
        return (
          node.topicName.toLowerCase().includes(searchText) ||
          (node.name != null && node.name.toLowerCase().includes(searchText))
        );
      }

      // Calculates whether a node is visible. This is a recursive function intended to be run on the root node.
      function calculateIsVisible(node: TreeNode, isAncestorVisible: boolean): boolean {
        // When the user is viewing available/visible nodes, we can skip setting the visibility for the children of
        // unavailable/invisible nodes since they are not going to be rendered.
        if (providerAvailable && node.name !== "root") {
          if ((showAvailable && !node.available) || (showVisible && !getIsTreeNodeVisibleInScene(node))) {
            isVisibleByKey[node.key] = false;
            return false;
          }
        }
        // Whether the ancestor is visible, or the current node matches the search text.
        const isAncestorOrCurrentVisible = isAncestorVisible || getIfTextMatches(node);
        let isChildVisible = false;

        if (node.type === "topic") {
          // Topic node: check if any namespace matches.
          const namespaces = availableNamespacesByTopic[node.topicName] || [];
          for (const namespace of namespaces) {
            const thisNamespacesMatches = namespace.toLowerCase().includes(searchText);
            isVisibleByKey[generateNodeKey({ topicName: node.topicName, namespace })] =
              isAncestorOrCurrentVisible || thisNamespacesMatches;
            isChildVisible = thisNamespacesMatches || isChildVisible;
          }
        } else {
          // Group node: recurse and check if any children are visible.
          for (const child of node.children) {
            isChildVisible = calculateIsVisible(child, isAncestorOrCurrentVisible) || isChildVisible;
          }
        }
        const isVisible = isAncestorOrCurrentVisible || isChildVisible;
        isVisibleByKey[node.key] = isVisible;
        return isVisible;
      }

      function getIsTreeNodeVisible(key: string): boolean {
        if (!searchText) {
          return true;
        }

        // Calculate the row visibility for all rows if we don't already have it stored.
        if (!hasCalculatedVisibility) {
          calculateIsVisible(rootTreeNode, false);
          hasCalculatedVisibility = true;
        }

        return !!isVisibleByKey[key];
      }

      return { getIsTreeNodeVisibleInTree: getIsTreeNodeVisible };
    },
    [
      topicDisplayMode,
      providerTopics.length,
      debouncedFilterText,
      getIsTreeNodeVisibleInScene,
      availableNamespacesByTopic,
      rootTreeNode,
    ]
  );

  const { allKeys, shouldExpandAllKeys } = useMemo(
    () => {
      return {
        allKeys: Object.keys(nodesByKey),
        shouldExpandAllKeys: !!debouncedFilterText,
      };
    },
    [debouncedFilterText, nodesByKey]
  );

  return {
    allKeys,
    derivedCustomSettingsByKey,
    getIsNamespaceCheckedByDefault,
    getIsTreeNodeVisibleInScene,
    getIsTreeNodeVisibleInTree,
    hasFeatureColumn,
    nodesByKey, // For testing.
    rootTreeNode,
    sceneErrorsByKey,
    selectedNamespacesByTopic,
    selectedTopicNames: memoizedSelectedTopicNames,
    shouldExpandAllKeys,
    toggleCheckAllAncestors,
    toggleCheckAllDescendants,
    toggleNamespaceChecked,
    toggleNodeChecked,
    toggleNodeExpanded,
  };
}
