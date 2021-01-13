// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { difference, keyBy, uniq, mapValues, xor, isEqual, flatten, omit } from "lodash";
import { useMemo, useCallback, useRef, createContext } from "react";
import { useDebounce } from "use-debounce";

import type { TreeNode, TopicTreeConfig, UseTreeInput, UseTreeOutput, DerivedCustomSettingsByKey } from "./types";
import filterMap from "webviz-core/src/filterMap";
import { TOPIC_DISPLAY_MODES } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/TopicViewModeSelector";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import { useShallowMemo } from "webviz-core/src/util/hooks";

const DEFAULT_TOPICS_COUNT_BY_KEY = {};
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
    const datatype = datatypesByTopic[topicName] || datatypesByTopic[`${SECOND_SOURCE_PREFIX}${topicName}`];
    return {
      type: "topic",
      key,
      featureKey,
      topicName,
      availableByColumn: hasFeatureColumn
        ? [availableTopicsNamesSet.has(topicName), availableTopicsNamesSet.has(`${SECOND_SOURCE_PREFIX}${topicName}`)]
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

export function getBaseKey(key: string): string {
  return key.replace(SECOND_SOURCE_PREFIX, "").replace("name_2:", "name:");
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
  settingsByKey,
  topicTreeConfig,
  uncategorizedGroupName,
}: UseTreeInput): UseTreeOutput {
  const topicTreeTopics = useMemo(
    () =>
      Array.from(flattenNode(topicTreeConfig))
        .map((node) => (node.topicName && !node.namespace ? node.topicName : undefined))
        .filter(Boolean),
    [topicTreeConfig]
  );

  const hasFeatureColumn = useMemo(() => providerTopics.some(({ name }) => name.startsWith(SECOND_SOURCE_PREFIX)), [
    providerTopics,
  ]);

  const rootTreeNode = useMemo((): TreeNode => {
    const allTopicNames = providerTopics.map((topic) => topic.name);
    const nonPrefixedTopicNames = uniq(allTopicNames.map((name) => name.replace(SECOND_SOURCE_PREFIX, "")));
    const availableTopicsNamesSet = new Set(allTopicNames);

    // Precompute uncategorized topics to add to the transformedTreeConfig before generating the TreeNodes.
    const uncategorizedTopicNames = difference(nonPrefixedTopicNames, topicTreeTopics);
    const datatypesByTopic = mapValues(keyBy(providerTopics, "name"), (item) => item.datatype);

    const newChildren = [...(topicTreeConfig.children || [])];
    if (uncategorizedTopicNames.length) {
      // Add uncategorized group node to root config.
      newChildren.push({
        name: uncategorizedGroupName,
        children: uncategorizedTopicNames.map((topicName) => ({ topicName })),
      });
    }
    // Generate the rootTreeNode. Don't mutate the original treeConfig, just make a copy with newChildren.
    return generateTreeNode(
      { ...topicTreeConfig, children: newChildren },
      { parentKey: undefined, datatypesByTopic, availableTopicsNamesSet, hasFeatureColumn }
    );
  }, [hasFeatureColumn, providerTopics, topicTreeConfig, topicTreeTopics, uncategorizedGroupName]);

  const nodesByKey: { [key: string]: TreeNode } = useMemo(() => {
    const flattenNodes = Array.from(flattenNode(rootTreeNode));
    return keyBy(flattenNodes, "key");
  }, [rootTreeNode]);

  const selections = useMemo(() => {
    const checkedKeysSet = new Set(checkedKeys);
    // Memoize node selections for extracting topic/namespace selections and checking node's visibility state.
    const isSelectedMemo: { [string]: boolean } = {};

    // Check if a node is selected and fill in the isSelectedMemo cache for future access.
    function isSelected(baseKey: ?string, isFeatureColumn: boolean): boolean {
      // Only topic node or top level group node may not have parentKey, and if we reached this level,
      // the descendants nodes should already been selected. Specifically, if a node key is included in the checkedKeys
      // and it doesn't have any parent node, it's considered to be selected.
      if (!baseKey) {
        return true;
      }

      const node = nodesByKey[baseKey];
      const featureKey = node?.featureKey || baseKey;
      if (!isFeatureColumn && isSelectedMemo[baseKey] === undefined) {
        isSelectedMemo[baseKey] =
          checkedKeysSet.has(baseKey) &&
          (node ? isSelected(node.parentKey, isFeatureColumn) : checkedKeysSet.has(`name:${uncategorizedGroupName}`));
      } else if (isFeatureColumn && isSelectedMemo[featureKey] === undefined) {
        isSelectedMemo[featureKey] =
          checkedKeysSet.has(featureKey) &&
          (node ? isSelected(node.parentKey, isFeatureColumn) : checkedKeysSet.has(`name_2:${uncategorizedGroupName}`));
      }
      return isSelectedMemo[isFeatureColumn ? featureKey : baseKey];
    }

    const selectedTopicNamesSet = new Set(
      filterMap(checkedKeys, (key) => {
        if (!key.startsWith("t:") || !isSelected(getBaseKey(key), key.includes(SECOND_SOURCE_PREFIX))) {
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

    const selectedTopicNames = Array.from(selectedTopicNamesSet);

    // If any selectedNamespaces is empty, fill in all available namespaces as default if
    // the topic for the namespace is not modified.
    difference(selectedTopicNames, modifiedNamespaceTopics).forEach((topicName) => {
      if (availableNamespacesByTopic[topicName] && !selectedNamespacesByTopic[topicName]) {
        selectedNamespacesByTopic[topicName] = availableNamespacesByTopic[topicName];
      }
    });

    // Returns whether a node/namespace is rendered in the 3d scene. Keep it inside useMemo since it needs to access the same isSelectedMemo.
    // A node is visible if it's available, itself and all ancestor nodes are selected.
    function getIsTreeNodeVisibleInScene(node: ?TreeNode, columnIndex: number, namespace?: string): boolean {
      if (!node) {
        return false;
      }
      const baseKey = getBaseKey(node.key);
      const isFeatureColumn = columnIndex === 1;
      if (namespace && node.type === "topic") {
        const prefixedTopicName =
          node.type === "topic"
            ? isFeatureColumn
              ? `${SECOND_SOURCE_PREFIX}${node.topicName}`
              : node.topicName
            : undefined;
        if (!prefixedTopicName) {
          return false;
        }
        if (!(selectedNamespacesByTopic[prefixedTopicName] || []).includes(namespace)) {
          return false;
        }
        // A namespace node is visible if the parent topic node is visible.
        return getIsTreeNodeVisibleInScene(node, columnIndex);
      }
      return !!node.availableByColumn[columnIndex] && isSelected(baseKey, isFeatureColumn);
    }
    return {
      selectedTopicNames,
      selectedNamespacesByTopic,
      getIsTreeNodeVisibleInScene,
    };
  }, [availableNamespacesByTopic, checkedKeys, modifiedNamespaceTopics, nodesByKey, uncategorizedGroupName]);

  const { selectedTopicNames, selectedNamespacesByTopic, getIsTreeNodeVisibleInScene } = selections;

  const visibleTopicsCountByKey = useMemo(() => {
    // No need to update if topics are unavailable.
    if (!providerTopics.length) {
      return DEFAULT_TOPICS_COUNT_BY_KEY;
    }
    const ret = {};

    selectedTopicNames.forEach((topicName) => {
      const isFeatureColumn = topicName.startsWith(SECOND_SOURCE_PREFIX);
      const baseTopicName = isFeatureColumn ? topicName.substr(SECOND_SOURCE_PREFIX.length) : topicName;
      const topicKey = generateNodeKey({ topicName: baseTopicName });
      const node = nodesByKey[topicKey];
      const isTopicNodeVisible = getIsTreeNodeVisibleInScene(node, isFeatureColumn ? 1 : 0);
      if (!isTopicNodeVisible) {
        return;
      }
      // The topic node is visible, now traverse up the tree and update all parent's visibleTopicsCount.
      const parentKey = nodesByKey[topicKey]?.parentKey;
      let parentNode = parentKey ? nodesByKey[parentKey] : undefined;
      while (parentNode) {
        ret[parentNode.key] = (ret[parentNode.key] || 0) + 1;
        parentNode = parentNode.parentKey ? nodesByKey[parentNode.parentKey] : undefined;
      }
    });
    return ret;
  }, [getIsTreeNodeVisibleInScene, nodesByKey, providerTopics.length, selectedTopicNames]);

  // Memoize topic names to prevent subscription update when expanding/collapsing nodes.
  const memoizedSelectedTopicNames = useShallowMemo(selectedTopicNames);

  const derivedCustomSettingsByKey = useMemo((): DerivedCustomSettingsByKey => {
    const result = {};
    for (const [topicKeyOrNamespaceKey, settings] of Object.entries(settingsByKey)) {
      const isFeatureTopicOrNamespace = topicKeyOrNamespaceKey.includes(SECOND_SOURCE_PREFIX);
      const columnIndex = isFeatureTopicOrNamespace ? 1 : 0;
      let key;
      if (topicKeyOrNamespaceKey.startsWith("ns:")) {
        // Settings for namespace. Currently only handle overrideColor and there are no defaultTopicSettings for namespaces.
        key = topicKeyOrNamespaceKey;
        if (key.startsWith(`ns:${SECOND_SOURCE_PREFIX}`)) {
          // Remove the feature prefix since we are going to store overrideColorByColumn under the base prefix.
          key = key.replace(`ns:${SECOND_SOURCE_PREFIX}`, "ns:");
        }
        if (!result[key]) {
          result[key] = {};
        }
      } else if (topicKeyOrNamespaceKey.startsWith("t:/")) {
        // Settings for topic.
        const topicName = topicKeyOrNamespaceKey.substr("t:".length);
        const baseTopicName = isFeatureTopicOrNamespace ? topicName.substr(SECOND_SOURCE_PREFIX.length) : topicName;
        key = generateNodeKey({ topicName: baseTopicName });
        // If any topic has default settings, compare settings with default settings to determine if settings has changed.
        const isDefaultSettings = defaultTopicSettings[topicName]
          ? isEqual(settings, defaultTopicSettings[topicName])
          : false;

        result[key] = !result[key]
          ? { isDefaultSettings }
          : // Both base and feature have to be default settings for `isDefaultSettings` to be true.
            { ...result[key], isDefaultSettings: isDefaultSettings && result[key].isDefaultSettings };
      }
      if (!key) {
        console.error(`Key ${topicKeyOrNamespaceKey} in settingsByKey is not a valid key.`);
        continue;
      }

      // $FlowFixMe some settings have overideColor field
      if (settings.overrideColor) {
        if (!result[key].overrideColorByColumn) {
          result[key].overrideColorByColumn = [undefined, undefined];
        }
        result[key].overrideColorByColumn[columnIndex] = settings.overrideColor;
      }
    }
    return result;
  }, [defaultTopicSettings, settingsByKey]);

  const onNamespaceOverrideColorChange = useCallback((newColor: ?string, prefixedNamespaceKey: string) => {
    const newSettingsByKey = newColor
      ? { ...settingsByKey, [prefixedNamespaceKey]: { overrideColor: newColor } }
      : omit(settingsByKey, prefixedNamespaceKey);
    saveConfig({ settingsByKey: newSettingsByKey });
  }, [saveConfig, settingsByKey]);

  const checkedNamespacesByTopicName = useMemo(() => {
    const checkedNamespaces = filterMap(checkedKeys, (item) => {
      if (item.startsWith("ns:")) {
        const [_, topicName, namespace] = item.split(":");
        return { topicName, namespace };
      }
    });
    return keyBy(checkedNamespaces, "topicName");
  }, [checkedKeys]);

  // A namespace is checked by default if none of the namespaces are in the checkedKeys and the selection is not modified.
  const getIsNamespaceCheckedByDefault = useCallback(
    (topicName: string, columnIndex) =>
      !modifiedNamespaceTopics.includes(topicName) &&
      !checkedNamespacesByTopicName[columnIndex === 1 ? `${SECOND_SOURCE_PREFIX}${topicName}` : topicName],
    [checkedNamespacesByTopicName, modifiedNamespaceTopics]
  );

  const toggleNamespaceChecked = useCallback(({
    topicName,
    namespace,
    columnIndex,
  }: {|
    topicName: string,
    namespace: string,
    columnIndex: number,
  |}) => {
    const isFeatureColumn = columnIndex === 1;
    const prefixedNamespaceKey = generateNodeKey({ topicName, namespace, isFeatureColumn });

    const prefixedTopicName = isFeatureColumn ? `${SECOND_SOURCE_PREFIX}${topicName}` : topicName;
    const isNamespaceCheckedByDefault = getIsNamespaceCheckedByDefault(topicName, columnIndex);

    let newCheckedKeys;
    if (isNamespaceCheckedByDefault) {
      // Add all other namespaces under the topic to the checked keys.
      const allNsKeys = (availableNamespacesByTopic[prefixedTopicName] || []).map((ns) =>
        generateNodeKey({ topicName, namespace: ns, isFeatureColumn })
      );
      const otherNamespaceKeys = difference(allNsKeys, [prefixedNamespaceKey]);
      newCheckedKeys = [...checkedKeys, ...otherNamespaceKeys];
    } else {
      newCheckedKeys = xor(checkedKeys, [prefixedNamespaceKey]);
    }

    saveConfig({
      checkedKeys: newCheckedKeys,
      modifiedNamespaceTopics: uniq([...modifiedNamespaceTopics, prefixedTopicName]),
    });
  }, [availableNamespacesByTopic, checkedKeys, getIsNamespaceCheckedByDefault, modifiedNamespaceTopics, saveConfig]);

  const toggleNodeChecked = useCallback((nodeKey: string, columnIndex: number) => {
    const key = columnIndex === 1 ? nodesByKey[nodeKey].featureKey : nodeKey;
    saveConfig({ checkedKeys: xor(checkedKeys, [key]) });
  }, [checkedKeys, nodesByKey, saveConfig]);

  const toggleCheckAllDescendants = useCallback((nodeKey: string, columnIndex: number) => {
    const node = nodesByKey[nodeKey];
    const isFeatureColumn = columnIndex === 1;
    const keyWithPrefix = isFeatureColumn ? node.featureKey : nodeKey;
    const isNowChecked = !checkedKeys.includes(keyWithPrefix);
    const nodeAndChildren = Array.from(flattenNode(node));
    const nodeAndChildrenKeys = nodeAndChildren.map((item) => (isFeatureColumn ? item.featureKey : item.key));
    const topicNames = nodeAndChildren.map((item) => (item.type === "topic" ? item.topicName : null)).filter(Boolean);
    const namespaceChildrenKeys = flatten(
      topicNames.map((topicName) =>
        (availableNamespacesByTopic[isFeatureColumn ? `${SECOND_SOURCE_PREFIX}${topicName}` : topicName] || []).map(
          (namespace) => generateNodeKey({ topicName, namespace, isFeatureColumn })
        )
      )
    );

    let newModififiedNamespaceTopics = [...modifiedNamespaceTopics];
    topicNames.forEach((topicName) => {
      const prefixedTopicName = isFeatureColumn ? `${SECOND_SOURCE_PREFIX}${topicName}` : topicName;
      if (availableNamespacesByTopic[prefixedTopicName]) {
        newModififiedNamespaceTopics.push(prefixedTopicName);
      }
    });
    newModififiedNamespaceTopics = isEqual(newModififiedNamespaceTopics, modifiedNamespaceTopics)
      ? modifiedNamespaceTopics
      : uniq(newModififiedNamespaceTopics);

    const nodeKeysToToggle = [...nodeAndChildrenKeys, ...namespaceChildrenKeys];
    // Toggle all children nodes' checked state to be the same as the new checked state for the node.
    saveConfig({
      modifiedNamespaceTopics: newModififiedNamespaceTopics,
      checkedKeys: isNowChecked
        ? uniq([...checkedKeys, ...nodeKeysToToggle])
        : difference(checkedKeys, nodeKeysToToggle),
    });
  }, [availableNamespacesByTopic, checkedKeys, modifiedNamespaceTopics, nodesByKey, saveConfig]);

  const toggleCheckAllAncestors = useCallback((
    nodeKey: string,
    columnIndex: number,
    namespaceParentTopicName?: string
  ) => {
    const isFeatureColumn = columnIndex === 1;
    const node = nodesByKey[nodeKey];
    let keyWithPrefix = isFeatureColumn && node ? node.featureKey : nodeKey;
    const prefixedTopicName =
      isFeatureColumn && namespaceParentTopicName
        ? `${SECOND_SOURCE_PREFIX}${namespaceParentTopicName}`
        : namespaceParentTopicName;

    let newModififiedNamespaceTopics = modifiedNamespaceTopics;
    if (namespaceParentTopicName && prefixedTopicName) {
      if (!modifiedNamespaceTopics.includes(prefixedTopicName)) {
        newModififiedNamespaceTopics = [...modifiedNamespaceTopics, prefixedTopicName];
      }
      const namespace = nodeKey.split(":").pop();
      keyWithPrefix = generateNodeKey({ topicName: namespaceParentTopicName, namespace, isFeatureColumn });
    }

    let prevChecked = checkedKeys.includes(keyWithPrefix);
    let newCheckedKeys = [...checkedKeys];
    if (!prevChecked && namespaceParentTopicName) {
      prevChecked = getIsNamespaceCheckedByDefault(namespaceParentTopicName, columnIndex);
      if (prevChecked && prefixedTopicName) {
        // Add all namespaces under the topic if it's checked by default.
        const allNsKeys = (availableNamespacesByTopic[prefixedTopicName] || []).map((ns) =>
          generateNodeKey({ topicName: namespaceParentTopicName, namespace: ns, isFeatureColumn })
        );
        newCheckedKeys = [...checkedKeys, ...allNsKeys];
      }
    }
    const isNowChecked = !prevChecked;

    const nodeAndAncestorKeys: string[] = [keyWithPrefix];
    let parentKey = namespaceParentTopicName
      ? generateNodeKey({ topicName: namespaceParentTopicName })
      : node?.parentKey;

    while (parentKey) {
      const keyToToggle = isFeatureColumn ? nodesByKey[parentKey]?.featureKey : parentKey;
      if (keyToToggle) {
        nodeAndAncestorKeys.push(keyToToggle);
      }
      parentKey = nodesByKey[parentKey]?.parentKey;
    }
    // Toggle all ancestor nodes' checked state to be the same as the new checked state for the node.
    saveConfig({
      modifiedNamespaceTopics: newModififiedNamespaceTopics,
      checkedKeys: isNowChecked
        ? uniq([...newCheckedKeys, ...nodeAndAncestorKeys])
        : difference(newCheckedKeys, nodeAndAncestorKeys),
    });
  }, [
    availableNamespacesByTopic,
    checkedKeys,
    getIsNamespaceCheckedByDefault,
    modifiedNamespaceTopics,
    nodesByKey,
    saveConfig,
  ]);

  const filterTextRef = useRef(filterText);
  filterTextRef.current = filterText;
  const toggleNodeExpanded = useCallback((nodeKey: string) => {
    // Don't allow any toggling expansion when filtering because we automatically expand all nodes.
    if (!filterTextRef.current) {
      saveConfig({ expandedKeys: xor(expandedKeys, [nodeKey]) });
    }
  }, [expandedKeys, saveConfig]);

  const sceneErrorsByKey = useMemo(() => {
    const result = {};

    function collectGroupErrors(groupKey: ?string, errors: string[]) {
      if (!groupKey) {
        return;
      }
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
      const baseKey = getBaseKey(topicKey);
      if (!result[baseKey]) {
        result[baseKey] = [];
      }
      const errorsWithTopicName = ((errors: any): string[]).map((err) => `${topicKey.substr("t:".length)}: ${err}`);
      result[baseKey].push(...(hasFeatureColumn ? errorsWithTopicName : errors));
      const topicNode = nodesByKey[baseKey];
      collectGroupErrors(topicNode?.parentKey, errorsWithTopicName);
    }
    return result;
  }, [hasFeatureColumn, nodesByKey, sceneErrorsByTopicKey]);

  const [debouncedFilterText] = useDebounce(filterText, 150);
  const { getIsTreeNodeVisibleInTree } = useMemo(() => {
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
        (node.name != null && node.name.toLowerCase().includes(searchText)) ||
        (hasFeatureColumn && `${SECOND_SOURCE_PREFIX}${node.topicName}`.toLowerCase().includes(searchText))
      );
    }

    // Calculates whether a node is visible. This is a recursive function intended to be run on the root node.
    function calculateIsVisible(node: TreeNode, isAncestorVisible: boolean): boolean {
      // When the user is viewing available/visible nodes, we can skip setting the visibility for the children of
      // unavailable/invisible nodes since they are not going to be rendered.
      if (providerAvailable && node.name !== "root") {
        const unavailable = hasFeatureColumn
          ? !node.availableByColumn[0] && !node.availableByColumn[1]
          : !node.availableByColumn[0];
        const invisibleInScene = hasFeatureColumn
          ? !getIsTreeNodeVisibleInScene(node, 0) && !getIsTreeNodeVisibleInScene(node, 1)
          : !getIsTreeNodeVisibleInScene(node, 0);

        if ((showAvailable && unavailable) || (showVisible && invisibleInScene)) {
          isVisibleByKey[node.key] = false;
          return false;
        }
      }
      // Whether the ancestor is visible, or the current node matches the search text.
      const isAncestorOrCurrentVisible = isAncestorVisible || getIfTextMatches(node);
      let isChildVisible = false;

      if (node.type === "topic") {
        // Topic node: check if any namespace matches.
        const namespaces =
          availableNamespacesByTopic[node.topicName] ||
          (hasFeatureColumn && availableNamespacesByTopic[`${SECOND_SOURCE_PREFIX}${node.topicName}`]) ||
          [];

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
  }, [
    topicDisplayMode,
    providerTopics.length,
    debouncedFilterText,
    getIsTreeNodeVisibleInScene,
    availableNamespacesByTopic,
    rootTreeNode,
    hasFeatureColumn,
  ]);

  const { allKeys, shouldExpandAllKeys } = useMemo(() => {
    return {
      allKeys: Object.keys(nodesByKey),
      shouldExpandAllKeys: !!debouncedFilterText,
    };
  }, [debouncedFilterText, nodesByKey]);

  return {
    allKeys,
    derivedCustomSettingsByKey,
    getIsNamespaceCheckedByDefault,
    getIsTreeNodeVisibleInScene,
    getIsTreeNodeVisibleInTree,
    hasFeatureColumn,
    nodesByKey, // For testing.
    onNamespaceOverrideColorChange,
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
    visibleTopicsCountByKey,
  };
}

export const TopicTreeContext = createContext<UseTreeOutput | null>(null);
