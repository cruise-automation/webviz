// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortBy, flatten, keyBy, mapValues, omit, isEqual, compact } from "lodash";
import microMemoize from "micro-memoize";

import { DEFAULT_IMPORTED_GROUP_NAME } from "./constants";
import {
  ALL_DATA_SOURCE_PREFIXES,
  TOPIC_CONFIG,
  removeTopicPrefixes,
  BASE_DATA_SOURCE_PREFIXES,
  FEATURE_DATA_SOURCE_PREFIXES,
} from "./topicGroupsUtils";
import type { TopicGroupConfig, VisibilityByColumn, NamespacesByColumn, SettingsByColumn } from "./types";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { TopicTreeConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/types";

function getSelectionsFromCheckedKeys(
  checkedKeys: string[]
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
  checkedKeys.forEach((item) => {
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
    } else {
      // Some checked node names do not start with `name:`
      selectedNamesSet.add(item);
    }
  });
  return { selectedExtensions, selectedTopics, selectedNamespacesByTopic, selectedNamesSet };
}

// Generate a list of parent names for each topic so that we know the topic is selected only if all parent names are selected
function* generateParentNamesByTopic(
  item: TopicTreeConfig,
  parentNames: string[]
): Generator<{| topic: string, parentNames: string[] |}, void, void> {
  const childrenItems = item.children;
  if (!childrenItems && item.topicName) {
    yield { topic: item.topicName, parentNames };
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

function dataSourcePrefixToColumnIndex(dataSourcePrefix: string): number {
  return FEATURE_DATA_SOURCE_PREFIXES.includes(dataSourcePrefix) ? 1 : 0;
}

// TODO(steel): This code (generateLegacyIdItems, getLegacyIdItems and migrateLegacyIds) was copied
// from a migration to break an import-link from main-repo code to the migrations directory. The
// migration code is tested in the migrations directory, but not here.  This code should be moved
// into a "real" migration. It remains here to unblock a release.
// DUPLICATED in webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel.js
type LegacyIdItem = {| legacyId: string, topic: string |} | {| legacyId: string, name: string |};

// DUPLICATED in webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel.js
function* generateLegacyIdItems(item: TopicTreeConfig): Generator<LegacyIdItem, void, void> {
  const { children, name, topicName, legacyIds } = item;
  if (legacyIds) {
    if (topicName) {
      yield* legacyIds.map((legacyId) => ({ legacyId, topic: topicName }));
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

// DUPLICATED in webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel.js
const getLegacyIdItems = microMemoize(
  (topicConfig): LegacyIdItem[] => {
    return flatten(topicConfig.children.map((item) => Array.from(generateLegacyIdItems(item))));
  }
);

// DUPLICATED in webviz-core/migrations/frozenMigrations/2020.05.06.00:00:03.migrate3DPanel.js
export function migrateLegacyIds(checkedKeys: string[]): string[] {
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
  return checkedKeys.map((node) => newCheckedNameOrTopicByOldNames[node] || node);
}

type MigrateInput = {|
  topicGroupDisplayName?: string,
  settingsByKey?: ?{ [topicKey: string]: any },
  checkedKeys?: ?(string[]),
  modifiedNamespaceTopics?: ?(string[]),
|};
// Create a new topic group called 'My Topics' and related fields based the old config
export function migratePanelConfigToTopicGroupConfig({
  topicGroupDisplayName = DEFAULT_IMPORTED_GROUP_NAME,
  settingsByKey,
  checkedKeys,
  modifiedNamespaceTopics,
}: MigrateInput): TopicGroupConfig {
  if (!checkedKeys) {
    return {
      displayName: topicGroupDisplayName,
      visibilityByColumn: [true, true],
      expanded: true,
      items: [],
    };
  }

  const migratedCheckedKeys = migrateLegacyIds(checkedKeys);
  const {
    selectedExtensions,
    selectedTopics,
    selectedNamespacesByTopic,
    selectedNamesSet,
  } = getSelectionsFromCheckedKeys(migratedCheckedKeys);
  const parentNamesByTopic = getParentNamesByTopic(TOPIC_CONFIG);
  const nonPrefixedTopics = removeTopicPrefixes(selectedTopics);

  let items = nonPrefixedTopics
    .map((topicName) => {
      const visibilityByColumn = [false, false];
      let settingsByColumn;
      let selectedNamespacesByColumn;

      for (const dataSourcePrefix of ALL_DATA_SOURCE_PREFIXES) {
        const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
        const columnIndex = dataSourcePrefixToColumnIndex(dataSourcePrefix);
        // a topic is selected if it's checked and all it's parent names are checked as well
        const isTopicSelected =
          selectedTopics.includes(prefixedTopicName) &&
          (parentNamesByTopic[prefixedTopicName] || ["(Uncategorized)"]).every((parentName) =>
            selectedNamesSet.has(parentName)
          );
        if (isTopicSelected) {
          // migrate visibility
          visibilityByColumn[columnIndex] = true;

          // migrate settings, no need to migrate topic settings for topics that are not selected
          if (settingsByKey && settingsByKey[`t:${prefixedTopicName}`]) {
            settingsByColumn = settingsByColumn || [undefined, undefined];
            settingsByColumn[columnIndex] = settingsByKey[`t:${prefixedTopicName}`];
          }

          // migrate topic namespaces, always set the selectedNamespacesByColumn field when the namespaces are modified
          if (
            (modifiedNamespaceTopics && modifiedNamespaceTopics.includes(prefixedTopicName)) ||
            selectedNamespacesByTopic[prefixedTopicName]
          ) {
            // Default to `undefined` will select all namespaces
            selectedNamespacesByColumn = selectedNamespacesByColumn || [undefined, undefined];
            if (selectedNamespacesByTopic[prefixedTopicName]) {
              selectedNamespacesByColumn[columnIndex] = selectedNamespacesByTopic[prefixedTopicName];
            }
          }
        }
      }

      // only selected the visible topics
      return isEqual(visibilityByColumn, [false, false])
        ? undefined
        : {
            topicName,
            visibilityByColumn,
            // Auto expanded any topics with selected namespaces.
            ...(selectedNamespacesByColumn && flatten(compact(selectedNamespacesByColumn)).length > 0
              ? { expanded: true }
              : undefined),
            ...(settingsByColumn ? { settingsByColumn } : undefined),
            ...(selectedNamespacesByColumn ? { selectedNamespacesByColumn } : undefined),
          };
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
      selectedNamespacesByColumn: [selectedTfNamespaces, []],
      visibilityByColumn: [true, false],
    });
  }

  items = sortBy(items, ["topicName"]);

  if (selectedMetadataNamespaces.length) {
    items.unshift({
      topicName: "/metadata",
      selectedNamespacesByColumn: [selectedMetadataNamespaces, []],
      visibilityByColumn: [true, false],
    });
  }

  return {
    displayName: topicGroupDisplayName,
    visibilityByColumn: [true, true],
    expanded: true,
    items,
  };
}

type VisibilityBySource = { [dataSourcePrefix: string]: boolean };
type NamespacesBySource = { [dataSourcePrefix: string]: string[] };
type SettingsBySource = { [dataSourcePrefix: string]: any };

function getGroupVisibilityByColumn(visibilityByColumn: ?VisibilityByColumn): VisibilityByColumn {
  if (visibilityByColumn) {
    return visibilityByColumn;
  }
  // Since the prefixes changed quite a bit, it's simpler to always make the base and feature column
  // visible by default
  return [true, true];
}

function getTopicVisibilityByColumn(
  visibilityByColumn: ?VisibilityByColumn,
  visibilityBySource: VisibilityBySource
): boolean[] {
  if (visibilityByColumn) {
    return visibilityByColumn;
  }
  const isBaseVisible = BASE_DATA_SOURCE_PREFIXES.some((prefix) => !!visibilityBySource[prefix]);
  const isFeatureVisible = FEATURE_DATA_SOURCE_PREFIXES.some((prefix) => !!visibilityBySource[prefix]);
  return [isBaseVisible, isFeatureVisible];
}

function getTopicSelectedNamespacesByColumn(
  selectedNamespacesByColumn: ?NamespacesByColumn,
  namespacesBySource: NamespacesBySource
): ?{| selectedNamespacesByColumn: NamespacesByColumn |} {
  let baseNamespaces = [];
  BASE_DATA_SOURCE_PREFIXES.forEach((prefix) => {
    if (namespacesBySource[prefix]) {
      baseNamespaces = namespacesBySource[prefix];
    }
  });
  let featureNamespaces = [];
  FEATURE_DATA_SOURCE_PREFIXES.forEach((prefix) => {
    if (namespacesBySource[prefix]) {
      featureNamespaces = namespacesBySource[prefix];
    }
  });
  if (isEqual(baseNamespaces, []) && isEqual(featureNamespaces, [])) {
    return undefined;
  }

  return { selectedNamespacesByColumn: [baseNamespaces, featureNamespaces] };
}

function getTopicSettingsByColumn(
  settingsByColumn: ?SettingsByColumn,
  settingsBySource: SettingsBySource
): ?{| settingsByColumn: SettingsByColumn |} {
  if (settingsByColumn) {
    return { settingsByColumn };
  }
  let baseSettings = {};
  BASE_DATA_SOURCE_PREFIXES.forEach((prefix) => {
    if (settingsBySource[prefix]) {
      baseSettings = settingsBySource[prefix];
    }
  });
  let featureSettings = {};
  FEATURE_DATA_SOURCE_PREFIXES.forEach((prefix) => {
    if (settingsBySource[prefix]) {
      featureSettings = settingsBySource[prefix];
    }
  });
  if (isEqual(baseSettings, {}) && isEqual(featureSettings, {})) {
    return undefined;
  }

  return {
    settingsByColumn: [
      isEqual(baseSettings, {}) ? undefined : baseSettings,
      isEqual(featureSettings, {}) ? undefined : featureSettings,
    ],
  };
}

export function migrateTopicGroupFromBySourceToByColumn(topicGroups: any): TopicGroupConfig[] {
  return topicGroups.map((group) => {
    return {
      ...omit(group, ["visibilityBySource"]),
      visibilityByColumn: getGroupVisibilityByColumn(group.visibilityByColumn),
      items: group.items.map((item) => {
        return {
          ...omit(item, ["visibilityBySource", "selectedNamespacesBySource", "settingsBySource"]),
          visibilityByColumn: getTopicVisibilityByColumn(
            item.visibilityByColumn,
            item.visibilityBySource || { "": true }
          ),
          ...getTopicSelectedNamespacesByColumn(item.selectedNamespacesByColumn, item.selectedNamespacesBySource || {}),
          ...getTopicSettingsByColumn(item.settingsByColumn, item.settingsBySource || {}),
        };
      }),
    };
  });
}

export function getSettingsByColumnWithDefaults(
  topicName: string,
  settingsByColumn: ?(any[])
): ?{ settingsByColumn: any[] } {
  const defaultTopicSettingsByColumn = getGlobalHooks()
    .startupPerPanelHooks()
    .ThreeDimensionalViz.getDefaultTopicSettingsByColumn(topicName);

  if (defaultTopicSettingsByColumn) {
    const newSettingsByColumn = settingsByColumn || [undefined, undefined];
    newSettingsByColumn.forEach((settings, columnIndex) => {
      if (settings === undefined) {
        // Only apply default settings if there are no settings present.
        newSettingsByColumn[columnIndex] = defaultTopicSettingsByColumn[columnIndex];
      }
    });
    return { settingsByColumn: newSettingsByColumn };
  }
  return settingsByColumn ? { settingsByColumn } : undefined;
}

export function addDefaultTopicSettings(topicGroups: TopicGroupConfig[]): TopicGroupConfig[] {
  return topicGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      ...getSettingsByColumnWithDefaults(item.topicName, item.settingsByColumn),
    })),
  }));
}
