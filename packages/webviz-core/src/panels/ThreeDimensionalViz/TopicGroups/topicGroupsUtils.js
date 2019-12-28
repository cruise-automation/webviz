// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { omit, flatten, uniq, isEmpty } from "lodash";
import microMemoize from "micro-memoize";

import type {
  TopicGroupConfig,
  TopicGroupType,
  NamespacesBySource,
  NamespaceItem,
  DisplayVisibilityBySource,
} from "./types";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type TopicConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/topicTree";
import { type Topic } from "webviz-core/src/players/types";
import type { Namespace } from "webviz-core/src/types/Messages";

export const TOPIC_CONFIG = getGlobalHooks()
  .perPanelHooks()
  .ThreeDimensionalViz.getDefaultTopicTree();

export const ALL_DATA_SOURCE_PREFIXES = ["", "/webviz_bag_2", "/webviz_tables_2", "/webviz_tables", "/webviz_labels"];

type DisplayNameByTopic = { [topicName: string]: string };
type NamespacesByTopic = { [topicName: string]: string[] };

export function removeTopicPrefixes(topicNames: string[]): string[] {
  const nonPrefixedNames = topicNames.map((name) => {
    for (const dataSourcePrefix of ALL_DATA_SOURCE_PREFIXES) {
      if (dataSourcePrefix && name.startsWith(dataSourcePrefix)) {
        return name.substr(dataSourcePrefix.length);
      }
    }
    return name;
  });
  return uniq(nonPrefixedNames);
}

// Generate topicGroups data for the UI.
export function getTopicGroups(
  groupsConfig: TopicGroupConfig[],
  {
    displayNameByTopic = {},
    namespacesByTopic = {},
    availableTopics = [],
  }: {|
    displayNameByTopic: DisplayNameByTopic,
    namespacesByTopic: NamespacesByTopic,
    availableTopics: Topic[],
  |}
): TopicGroupType[] {
  const availableTopicNamesSet = new Set(availableTopics.map(({ name }) => name));

  return groupsConfig.map((groupConfig, idx) => {
    const id = `${groupConfig.displayName.split(" ").join("-")}_${idx}`;
    const isTopicGroupVisible = !!groupConfig.visible;
    return {
      ...groupConfig,
      derivedFields: {
        id,
        items: groupConfig.items.map((topicItemConfig, idx1) => {
          const {
            displayName,
            topicName,
            selectedNamespacesBySource,
            visibilitiesBySource = { "": true }, // set the base topic to be visible by default
          } = topicItemConfig;

          const availableNamespacesBySource = {};
          const topicDisplayVisibilityBySource = {};
          let available = false;

          ALL_DATA_SOURCE_PREFIXES.forEach((dataSourcePrefix) => {
            const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
            if (availableTopicNamesSet.has(prefixedTopicName)) {
              available = true;
              // only show namespaces when the topic is available
              if (namespacesByTopic[prefixedTopicName]) {
                availableNamespacesBySource[dataSourcePrefix] = namespacesByTopic[prefixedTopicName];
              }

              topicDisplayVisibilityBySource[dataSourcePrefix] = {
                isParentVisible: isTopicGroupVisible,
                badgeText: getBadgeTextByTopicName(prefixedTopicName),
                // always visible by default
                // $FlowFixMe the field is missing in object literal
                visible: visibilitiesBySource[dataSourcePrefix] != null ? visibilitiesBySource[dataSourcePrefix] : true,
                available: true,
              };
            }
          });

          // build an array of namespace items with visibility and availability for easy render
          const namespaceItems = getNamespacesItemsBySource(
            topicName,
            availableNamespacesBySource,
            selectedNamespacesBySource,
            topicDisplayVisibilityBySource,
            isTopicGroupVisible
          );

          return {
            // save the original config in order to save back to panelConfig
            ...topicItemConfig,
            derivedFields: {
              id: `${id}_${idx1}`,
              displayName: displayName || displayNameByTopic[topicName] || topicName,
              displayVisibilityBySource: topicDisplayVisibilityBySource,
              namespaceItems,
              available,
            },
          };
        }),
      },
    };
  });
}

type TopicTreeItem = {| topic: string, name: string |};
// Traverse the tree and flatten the children items in the topicConfig.
function* flattenItem(item: TopicConfig, name: string): Generator<TopicTreeItem, void, void> {
  const childrenItems = item.children;
  // extensions or leaf nodes
  if (!childrenItems || item.extension) {
    // remove children before adding a new node for extensions, otherwise add the node directly
    yield { ...omit(item, "children"), name };
  }
  if (childrenItems) {
    for (const subItem of childrenItems) {
      let subItemName = `${name} / ${subItem.name || ""}`;
      if (!subItem.name && subItem.topic) {
        subItemName = name;
      }
      yield* flattenItem(subItem, subItemName);
    }
  }
}

// Memoize the flattened nodes since it only needs to be computed once.
export const getFlattenedTreeNodes = microMemoize(
  (topicConfig): TopicTreeItem[] => {
    return flatten(topicConfig.children.map((item) => Array.from(flattenItem(item, item.name || ""))));
  }
);

// Generate a map based on topicTree config, so we can map a topicName or extension to a preconfigured name.
export const buildItemDisplayNameByTopicOrExtension = microMemoize(
  (topicConfig: TopicConfig): DisplayNameByTopic => {
    const flattenedTopicNodes = getFlattenedTreeNodes(topicConfig);
    const result = { "/metadata": "Map", "/tf": "TF" };
    for (const node of flattenedTopicNodes) {
      const key = node.topic || node.extension;
      if (key) {
        result[key] = node.name;
      }
    }
    return result;
  }
);

// Generate a map from topic to available namespaces, including migrated extensions (under /metadata topic),
// tf, and dynamically derived namespaces from messages.
export function buildAvailableNamespacesByTopic({
  topicConfig = TOPIC_CONFIG,
  allNamespaces = [],
  transformIds = [],
}: {
  topicConfig: TopicConfig,
  allNamespaces: Namespace[],
  transformIds: string[],
}): NamespacesByTopic {
  const namespacesByTopic = {};
  const displayNameByTopicOrExtension = buildItemDisplayNameByTopicOrExtension(topicConfig);
  // Group all non-topic related extensions under /metadata topic. Currently they are all map related extensions
  namespacesByTopic["/metadata"] = Object.keys(displayNameByTopicOrExtension).filter((key) => !key.startsWith("/"));
  namespacesByTopic["/tf"] = transformIds;

  for (const { topic, name } of allNamespaces) {
    namespacesByTopic[topic] = namespacesByTopic[topic] || [];
    namespacesByTopic[topic].push(name);
  }

  return namespacesByTopic;
}

// Derive data source badge text from topic name. Keep it simple for now as we only have these prefixes.
function getBadgeTextByTopicName(topicName: string): string {
  if (topicName.startsWith("/tables/")) {
    return "T1";
  } else if (topicName.startsWith("/webviz_tables_2/")) {
    return "T2";
  } else if (topicName.startsWith("/webviz_bag_2/")) {
    return "B2";
  } else if (topicName.startsWith("/webviz_labels/")) {
    return "L1";
  }
  return "B1";
}

// Build a list of all available namespaces with data source info.
export function getNamespacesItemsBySource(
  topicName: string,
  availableNamespacesBySource: NamespacesBySource,
  selectedNamespacesBySource: NamespacesBySource = {},
  topicDisplayVisibilityBySource: DisplayVisibilityBySource,
  isTopicGroupVisible: boolean
): NamespaceItem[] {
  if (isEmpty(availableNamespacesBySource)) {
    return [];
  }
  // $FlowFixMe mixed type is incompatible with string when using Object.values
  const allAvailableNamespaces: string[] = uniq(flatten(Object.values(availableNamespacesBySource)));
  const availableDataSourcePrefixes = Object.keys(availableNamespacesBySource);

  return allAvailableNamespaces.map((namespace) => {
    return {
      name: namespace,
      displayVisibilityBySource: availableDataSourcePrefixes.reduce((memo, dataSourcePrefix) => {
        memo[dataSourcePrefix] = {
          isParentVisible: isTopicGroupVisible ? topicDisplayVisibilityBySource[dataSourcePrefix].visible : false,
          badgeText: getBadgeTextByTopicName(`${dataSourcePrefix}${topicName}`),
          visible:
            selectedNamespacesBySource[dataSourcePrefix] != null
              ? selectedNamespacesBySource[dataSourcePrefix].includes(namespace)
              : true,
          available: (availableNamespacesBySource[dataSourcePrefix] || []).includes(namespace),
        };
        return memo;
      }, {}),
    };
  });
}

export function getSelectionsFromTopicGroupConfig(
  topicGroupsConfig: TopicGroupConfig[]
): {
  selectedTopicNames: string[],
  selectedNamespacesByTopic: { [topicName: string]: string[] },
  selectedTopicSettingsByTopic: { [topicName: string]: any },
} {
  const selectedTopicNames = [];
  const selectedNamespacesByTopic = {};
  const selectedTopicSettingsByTopic = {};
  topicGroupsConfig.forEach(({ visible: topicGroupVisible, items }) => {
    if (!topicGroupVisible) {
      return;
    }
    items.forEach(({ topicName, visibilitiesBySource, settingsBySource, selectedNamespacesBySource = {} }) => {
      // if the visibility is not set, default to make the non-prefixed topic visible and add the corresponding namespaces
      if (!visibilitiesBySource) {
        selectedTopicNames.push(topicName);
        if (selectedNamespacesBySource[""]) {
          selectedNamespacesByTopic[topicName] = selectedNamespacesBySource[""];
        }
      } else {
        for (const [dataSourcePrefix, visible] of Object.entries(visibilitiesBySource)) {
          const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
          if (visible) {
            selectedTopicNames.push(prefixedTopicName);
          }
          // only need to set namespaces for the selected topics
          if (selectedNamespacesBySource[dataSourcePrefix]) {
            selectedNamespacesByTopic[prefixedTopicName] = selectedNamespacesBySource[dataSourcePrefix];
          }
        }
      }
      if (!settingsBySource) {
        return;
      }
      for (const [dataSourcePrefix, settings] of Object.entries(settingsBySource)) {
        const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
        // only need to set namespaces for the selected topics
        if (settings) {
          selectedTopicSettingsByTopic[prefixedTopicName] = settings;
        }
      }
    });
  });
  return {
    selectedTopicNames,
    selectedNamespacesByTopic,
    selectedTopicSettingsByTopic,
  };
}
