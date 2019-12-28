// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual, sortBy, flatten, keyBy, mapValues } from "lodash";
import microMemoize from "micro-memoize";

import { ALL_DATA_SOURCE_PREFIXES, TOPIC_CONFIG, removeTopicPrefixes } from "./topicGroupsUtils";
import type { TopicGroupConfig } from "./types";
import { type TopicConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/topicTree";

function getSelectionsFromCheckedNodes(
  checkedNodes: string[]
): {
  selectedTopics: string[],
  selectedExtensions: string[],
  selectedNamespacesByTopic: { [topicName: string]: string[] },
  selectedNamesSet: Set<string>,
} {
  const selectedExtensions = [];
  const selectedTopics = [];
  const selectedNamespacesByTopic = {};
  const selectedNamesSet = new Set();
  checkedNodes.forEach((item) => {
    if (item.startsWith("t:")) {
      selectedTopics.push(item.substr("t:".length));
    } else if (item.startsWith("/")) {
      selectedTopics.push(item);
    } else if (item.startsWith("x:")) {
      selectedExtensions.push(item.substr("x:".length));
    } else if (item.startsWith("ns:")) {
      const [topic, namespace] = item.substr("ns:".length).split(":");
      if (topic && namespace) {
        selectedNamespacesByTopic[topic] = selectedNamespacesByTopic[topic] || [];
        selectedNamespacesByTopic[topic].push(namespace);
      }
    } else if (item.startsWith("name:")) {
      selectedNamesSet.add(item.substr("name:".length));
    }
  });
  return { selectedExtensions, selectedTopics, selectedNamespacesByTopic, selectedNamesSet };
}

// Generate a list of parent names for each topic so that we know the topic is selected only if all parent names are selected
function* generateParentNamesByTopic(
  item: TopicConfig,
  parentNames: string[]
): Generator<{| topic: string, parentNames: string[] |}, void, void> {
  const childrenItems = item.children;
  if (!childrenItems && item.topic) {
    yield { topic: item.topic, parentNames };
  }
  if (childrenItems) {
    for (const subItem of childrenItems) {
      yield* generateParentNamesByTopic(subItem, parentNames.concat(item.name ? [item.name] : []));
    }
  }
}

// Memoize the parentNamesByTopic since it only needs to be computed once.
const getParentNamesByTopic = microMemoize(
  (topicConfig): { [topicName: string]: string[] } => {
    const items = flatten(topicConfig.children.map((item) => Array.from(generateParentNamesByTopic(item, []))));
    return mapValues(keyBy(items, "topic"), ({ parentNames }) => parentNames);
  }
);

type LegacyIdItem = {| legacyId: string, topic: string |} | {| legacyId: string, name: string |};
function* generateLegacyIdItems(item: TopicConfig): Generator<LegacyIdItem, void, void> {
  const { children, name, topic, legacyIds } = item;
  if (legacyIds) {
    if (topic) {
      yield* legacyIds.map((legacyId) => ({ legacyId, topic }));
    } else if (name) {
      yield* legacyIds.map((legacyId) => ({ legacyId, name }));
    }
  }
  if (children) {
    for (const subItem of children) {
      yield* generateLegacyIdItems(subItem);
    }
  }
}

const getLegacyIdItems = microMemoize(
  (topicConfig): LegacyIdItem[] => {
    return flatten(topicConfig.children.map((item) => Array.from(generateLegacyIdItems(item))));
  }
);

// Migrate legacyIds related to topics and names to the actual names and topics.
export function migrateLegacyIds(checkedNodes: string[]): string[] {
  const legacyIdItems = getLegacyIdItems(TOPIC_CONFIG);
  const newCheckedNameOrTopicByOldNames = {};
  for (const { topic, name, legacyId } of legacyIdItems) {
    if (name) {
      newCheckedNameOrTopicByOldNames[`${legacyId}`] = `name:${name}`;
      newCheckedNameOrTopicByOldNames[`name:${legacyId}`] = `name:${name}`;
    }
    if (topic) {
      newCheckedNameOrTopicByOldNames[`t:${legacyId}`] = `t:${topic}`;
      // If both name and topic are present, only use topic as the new checkedName
      newCheckedNameOrTopicByOldNames[`${legacyId}`] = `t:${topic}`;
    }
  }
  return checkedNodes.map((node) => newCheckedNameOrTopicByOldNames[node] || node);
}

// Create a new topic group called 'My Topics' and related fields based the old config
export function migratePanelConfigToTopicGroupConfig({
  topicSettings,
  checkedNodes,
  modifiedNamespaceTopics,
}: {
  topicSettings?: ?{ [topicName: string]: any },
  checkedNodes?: ?(string[]),
  modifiedNamespaceTopics?: ?(string[]),
}): TopicGroupConfig {
  if (!checkedNodes) {
    return {
      displayName: "My Topics",
      visible: true,
      expanded: true,
      items: [],
    };
  }

  const migratedCheckedNodes = migrateLegacyIds(checkedNodes);
  const {
    selectedExtensions,
    selectedTopics,
    selectedNamespacesByTopic,
    selectedNamesSet,
  } = getSelectionsFromCheckedNodes(migratedCheckedNodes);
  const parentNamesByTopic = getParentNamesByTopic(TOPIC_CONFIG);
  const nonPrefixedTopics = removeTopicPrefixes(selectedTopics);

  let items = nonPrefixedTopics
    .map((topicName) => {
      let visibilitiesBySource;
      let settingsBySource;
      let selectedNamespacesBySource;

      for (const dataSourcePrefix of ALL_DATA_SOURCE_PREFIXES) {
        const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
        // a topic is selected if it's checked and all it's parent names are checked as well
        const isTopicSelected =
          selectedTopics.includes(prefixedTopicName) &&
          (parentNamesByTopic[prefixedTopicName] || ["(Uncategorized)"]).every((parentName) =>
            selectedNamesSet.has(parentName)
          );
        if (isTopicSelected) {
          // migrate visibility
          visibilitiesBySource = visibilitiesBySource || {};
          visibilitiesBySource[dataSourcePrefix] = true;

          // migrate settings, no need to migrate topic settings for topics that are not selected
          if (topicSettings && topicSettings[prefixedTopicName]) {
            settingsBySource = settingsBySource || {};
            settingsBySource[dataSourcePrefix] = topicSettings[prefixedTopicName];
          }

          // migrate topic namespaces, always set the selectedNamespacesBySource field when the namespaces are modified
          if (
            (modifiedNamespaceTopics && modifiedNamespaceTopics.includes(prefixedTopicName)) ||
            selectedNamespacesByTopic[prefixedTopicName]
          ) {
            selectedNamespacesBySource = selectedNamespacesBySource || {};
            if (selectedNamespacesByTopic[prefixedTopicName]) {
              selectedNamespacesBySource[dataSourcePrefix] = selectedNamespacesByTopic[prefixedTopicName];
            }
          }
        }
      }

      // only selected the visible topics
      return visibilitiesBySource
        ? {
            topicName,
            // auto expand the topic if it has any selected namespaces
            ...(flatten(Object.values(selectedNamespacesBySource || {})).length > 0 ? { expanded: true } : undefined),
            ...(settingsBySource ? { settingsBySource } : undefined),
            // no need to store the default visibilitiesBySource in panelConfig
            ...(!visibilitiesBySource || isEqual(visibilitiesBySource, { "": true })
              ? undefined
              : { visibilitiesBySource }),
            ...(selectedNamespacesBySource ? { selectedNamespacesBySource } : undefined),
          }
        : null;
    })
    .filter(Boolean);

  const selectedMetadataNamespaces = [];
  const selectedTfNamespaces = [];
  for (const extension of selectedExtensions) {
    if (extension.startsWith("TF")) {
      selectedTfNamespaces.push(extension.substr("TF.".length));
    } else {
      selectedMetadataNamespaces.push(extension);
    }
  }

  // TODO(Audrey): order the items based on the order of the tree
  // If any of the tf or metadata names are selected, we'll enable the topic and all namespaces by default.
  if (selectedTfNamespaces.length) {
    items.push({
      topicName: "/tf",
      selectedNamespacesBySource: { "": selectedTfNamespaces },
    });
  }
  items = sortBy(items, ["topicName"]);
  if (selectedMetadataNamespaces.length) {
    items.unshift({
      topicName: "/metadata",
      selectedNamespacesBySource: { "": selectedMetadataNamespaces },
    });
  }

  return {
    // give default displayName, and select/expand state
    displayName: "My Topics",
    visible: true,
    expanded: true,
    items,
  };
}
