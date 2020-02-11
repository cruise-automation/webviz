// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { omit, flatten, uniq, isEmpty, keyBy, mapValues, assign, zipObject } from "lodash";
import microMemoize from "micro-memoize";

import type {
  DisplayVisibilityBySource,
  GroupVisibilityBySource,
  NamespaceItem,
  NamespacesBySource,
  TopicGroupConfig,
  TopicGroupType,
  VisibilityBySource,
} from "./types";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { SceneErrors } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/index";
import { type TopicConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/topicTree";
import { type Topic } from "webviz-core/src/players/types";
import type { Namespace } from "webviz-core/src/types/Messages";

export const TOPIC_CONFIG = getGlobalHooks()
  .perPanelHooks()
  .ThreeDimensionalViz.getDefaultTopicTree();

export const BASE_DATA_SOURCE_PREFIXES = ["", "/webviz_tables", "/webviz_labels"];
export const FEATURE_DATA_SOURCE_PREFIXES = ["/webviz_bag_2", "/webviz_tables_2"];
export const ALL_DATA_SOURCE_PREFIXES = [...BASE_DATA_SOURCE_PREFIXES, ...FEATURE_DATA_SOURCE_PREFIXES];
export const DEFAULT_GROUP_VISIBILITY_BY_SOURCE = getVisibilityBySource(ALL_DATA_SOURCE_PREFIXES, true);

type DisplayNameByTopic = { [topicName: string]: string };
type ErrorsByTopic = { [topicName: string]: string[] };
type NamespacesByTopic = { [topicName: string]: string[] };

export function removeTopicPrefixes(topicNames: string[]): string[] {
  const nonPrefixedNames = topicNames.map((name) => {
    for (const dataSourcePrefix of ALL_DATA_SOURCE_PREFIXES) {
      // Add extra `/` as startsWith str to avoid converting `/webviz_tables_2/some_topic` to `_2/some_topic`.
      if (dataSourcePrefix && name.startsWith(`${dataSourcePrefix}/`)) {
        return name.substr(dataSourcePrefix.length);
      }
    }
    return name;
  });
  return uniq(nonPrefixedNames);
}

function getVisibilityBySource(prefixes: string[], visible: boolean): VisibilityBySource {
  return zipObject(prefixes, new Array(prefixes.length).fill().map((_) => visible));
}

// Currently we support two groups of data sources across topics. Separating them into BASE and FEATURE can help the user
// easily toggle the visibility at the group level. Only add the 2nd group when feature topics are present.
function getGroupDisplayVisibilityBySourceByColumn(
  groupVisibilityBySource: VisibilityBySource,
  availableTopics: Topic[],
  isFirstTopicGroup: boolean
): GroupVisibilityBySource[] {
  const displayVisibilityBySource = [];
  const isBaseVisible = BASE_DATA_SOURCE_PREFIXES.every((prefix) =>
    // Only default to true for the first topic group because rendering too many groups may be expensive.
    groupVisibilityBySource[prefix] == null ? isFirstTopicGroup : groupVisibilityBySource[prefix]
  );
  displayVisibilityBySource.push({
    visible: isBaseVisible,
    visibilityBySource: getVisibilityBySource(BASE_DATA_SOURCE_PREFIXES, isBaseVisible),
  });
  // Only show the 2nd group visibility toggle if any of the 2nd data sources are available.
  const hasSecondGroupVisibilityToggle = availableTopics.some(({ name }) =>
    FEATURE_DATA_SOURCE_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
  if (hasSecondGroupVisibilityToggle) {
    const isFeatureVisible = FEATURE_DATA_SOURCE_PREFIXES.every((prefix) =>
      // Only default to true for the first topic group because rendering too many groups may be expensive.
      groupVisibilityBySource[prefix] == null ? isFirstTopicGroup : groupVisibilityBySource[prefix]
    );
    displayVisibilityBySource.push({
      visible: isFeatureVisible,
      visibilityBySource: getVisibilityBySource(FEATURE_DATA_SOURCE_PREFIXES, isFeatureVisible),
    });
  }
  return displayVisibilityBySource;
}

// Generate topicGroups data for the UI.
export function getTopicGroups(
  groupsConfig: TopicGroupConfig[],
  {
    availableTopics,
    displayNameByTopic,
    errorsByTopic,
    namespacesByTopic,
    filterText,
    filteredKeysSet,
  }: {|
    displayNameByTopic: DisplayNameByTopic,
    namespacesByTopic: NamespacesByTopic,
    availableTopics: Topic[],
    errorsByTopic: ErrorsByTopic,
    filterText?: string,
    filteredKeysSet?: ?Set<string>,
  |}
): TopicGroupType[] {
  const availableTopicNamesSet = new Set(availableTopics.map(({ name }) => name));
  const datatypeKeyByTopicName = mapValues(keyBy(availableTopics, "name"), "datatype");

  return groupsConfig.map(({ items, ...rest }, idx) => {
    const id = `${rest.displayName.split(" ").join("-")}_${idx}`;
    let groupDisplayVisibilityBySourceByColumn = [];
    let groupVisibilityBySource = {};
    if (availableTopics.length) {
      groupDisplayVisibilityBySourceByColumn = getGroupDisplayVisibilityBySourceByColumn(
        rest.visibilityBySource || {},
        availableTopics,
        idx === 0
      );
      groupVisibilityBySource = assign(
        {},
        ...groupDisplayVisibilityBySourceByColumn.map((item) => item.visibilityBySource)
      );
    }

    let isAnyTopicFiltered = false;

    const topicItems = items.map((topicItemConfig, idx1) => {
      const {
        displayName,
        topicName,
        selectedNamespacesBySource,
        visibilityBySource = { "": true }, // set the base topic to be visible by default
      } = topicItemConfig;

      const availableNamespacesBySource = {};
      const topicDisplayVisibilityBySource = {};
      const availablePrefixes = [];
      let datatype;
      const errors = [];
      // If base topic and namespaces are not available, we'll use placeholders in the UI so the data source badges are aligned
      const isBaseTopicAvailable = availableTopicNamesSet.has(topicName);
      const isBaseNamespaceAvailable = (namespacesByTopic[topicName] || []).length > 0;

      ALL_DATA_SOURCE_PREFIXES.forEach((dataSourcePrefix) => {
        const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
        if (availableTopicNamesSet.has(prefixedTopicName)) {
          if (errorsByTopic[prefixedTopicName]) {
            const errorSource = dataSourcePrefix ? `(${dataSourcePrefix}) ` : "";
            errors.push(...errorsByTopic[prefixedTopicName].map((error) => `${errorSource}${error}`));
          }
          availablePrefixes.push(dataSourcePrefix);
          datatype = datatypeKeyByTopicName[prefixedTopicName];
          // only show namespaces when the topic is available
          if (namespacesByTopic[prefixedTopicName]) {
            availableNamespacesBySource[dataSourcePrefix] = namespacesByTopic[prefixedTopicName];
          }

          topicDisplayVisibilityBySource[dataSourcePrefix] = {
            isParentVisible: groupVisibilityBySource[dataSourcePrefix],
            badgeText: getBadgeTextByTopicName(prefixedTopicName),
            // always visible by default
            // $FlowFixMe the field is missing in object literal
            visible: visibilityBySource[dataSourcePrefix] != null ? visibilityBySource[dataSourcePrefix] : true,
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
        groupVisibilityBySource
      );

      const displayNameWithFallback = displayName || displayNameByTopic[topicName];
      const isTopicShownInList =
        !filteredKeysSet ||
        (filteredKeysSet && (filteredKeysSet.has(topicName) || filteredKeysSet.has(displayNameWithFallback)));

      // auto select group if any topic in this group is selected
      if (isTopicShownInList) {
        isAnyTopicFiltered = true;
      }
      return {
        // save the original config in order to save back to panelConfig
        ...topicItemConfig,
        derivedFields: {
          id: `${id}_${idx1}`,
          availablePrefixes,
          isShownInList: isTopicShownInList,
          // derive data source badge spacing from # of the prefix groups
          dataSourceBadgeSlots: groupDisplayVisibilityBySourceByColumn.length,
          displayName: displayNameWithFallback || topicName,
          displayVisibilityBySource: topicDisplayVisibilityBySource,
          isBaseNamespaceAvailable,
          isBaseTopicAvailable,
          namespaceItems,
          ...(filterText ? { filterText } : undefined),
          ...(errors.length ? { errors } : undefined),
          ...(datatype ? { datatype } : undefined),
        },
      };
    });

    // TODO(Audrey): auto expand visible groups or groups with visible children, need to use react virtualized to improve perf.
    const isGroupShownInList =
      !filteredKeysSet || isAnyTopicFiltered || (filteredKeysSet && filteredKeysSet.has(rest.displayName));

    return {
      ...rest,
      expanded: rest.expanded == null ? idx === 0 : rest.expanded,
      derivedFields: {
        id,
        displayVisibilityBySourceByColumn: groupDisplayVisibilityBySourceByColumn,
        isShownInList: isGroupShownInList,
        ...(filterText ? { filterText } : undefined),
      },
      items: topicItems,
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
  groupVisibilityBySource: VisibilityBySource
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
          isParentVisible: groupVisibilityBySource[dataSourcePrefix]
            ? topicDisplayVisibilityBySource[dataSourcePrefix].visible
            : false,
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
  topicGroupsConfig.forEach(
    ({ visibilityBySource: topicGroupVisibilityBySource = DEFAULT_GROUP_VISIBILITY_BY_SOURCE, items }) => {
      items.forEach(({ topicName, visibilityBySource, settingsBySource, selectedNamespacesBySource = {} }) => {
        // if the visibility is not set, default to make the non-prefixed topic visible and add the corresponding namespaces
        if (!visibilityBySource) {
          // return early if the the group prefix is not visible
          if (!topicGroupVisibilityBySource[""]) {
            return;
          }
          selectedTopicNames.push(topicName);
          if (selectedNamespacesBySource[""]) {
            selectedNamespacesByTopic[topicName] = selectedNamespacesBySource[""];
          }
        } else {
          for (const [dataSourcePrefix, visible] of Object.entries(visibilityBySource)) {
            // no need to process if the the group prefix is not visible
            if (!topicGroupVisibilityBySource[dataSourcePrefix]) {
              continue;
            }
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
          // only need to set settings for the selected topics
          if (settings) {
            selectedTopicSettingsByTopic[prefixedTopicName] = settings;
          }
        }
      });
    }
  );
  return {
    selectedTopicNames,
    selectedNamespacesByTopic,
    selectedTopicSettingsByTopic,
  };
}

export function getSceneErrorsByTopic(sceneErrors: SceneErrors): { [topicName: string]: string[] } {
  const res = {};
  // generic errors
  for (const [topic, message] of sceneErrors.topicsWithError) {
    if (!res[topic]) {
      res[topic] = [];
    }
    res[topic].push(message);
  }
  // errors related to missing frame ids and transform ids
  [
    { description: "missing frame id", errors: sceneErrors.topicsMissingFrameIds },
    {
      description: `missing transforms to ${sceneErrors.rootTransformID}:`,
      errors: sceneErrors.topicsMissingTransforms,
    },
  ].forEach(({ description, errors }) => {
    errors.forEach((_, topic) => {
      if (!res[topic]) {
        res[topic] = [];
      }
      res[topic].push(description);
    });
  });
  return res;
}

export type TreeNodeConfig = {|
  topicName?: string,
  name: string,
  children?: TreeNodeConfig[],
|};

// Transform the existing topic tree config to the topic group tree by removing extension, icon,
// legacyIds, and add map and tf topic.
// TODO(Audrey): remove the transform logic once we release topic grouping feature
export function transformTopicTree(oldTree: TopicConfig): TreeNodeConfig {
  const newTree: TreeNodeConfig = {
    ...(oldTree.name ? { name: oldTree.name || oldTree.topic } : undefined),
    ...(oldTree.topic ? { topicName: oldTree.topic } : undefined),
  };
  if (oldTree.name && oldTree.name === "TF") {
    newTree.topicName = "/tf";
  }
  const oldChildren = oldTree.children;

  if (oldChildren) {
    const newChildren = [];
    // Replace extensions with /metadata topic
    if (oldChildren.some((item) => item.extension)) {
      newChildren.push({ name: "Map", topicName: "/metadata" });
    }

    newChildren.push(
      ...oldChildren.map((child) => (child.extension ? null : transformTopicTree(child))).filter(Boolean)
    );
    if (newChildren.length) {
      newTree.children = newChildren;
    }
  }
  return newTree;
}
