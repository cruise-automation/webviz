// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { omit, flatten, uniq, keyBy, mapValues, get, isEqual } from "lodash";
import microMemoize from "micro-memoize";

import { FOCUS_ITEM_OPS, KEYBOARD_FOCUS_TYPES } from "./constants";
import { getSettingsByColumnWithDefaults } from "./topicGroupsMigrations";
import {
  toggleVisibility,
  keyboardToggleAllForGroupVisibility,
  keyboardToggleAllForTopicVisibility,
} from "./topicGroupsVisibilityUtils";
import type {
  FocusItemOp,
  KeyboardFocusData,
  KeyboardFocusType,
  TopicGroupConfig,
  TopicGroupType,
  TopicItemConfig,
  TopicItem,
  VisibilityByColumn,
} from "./types";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { SceneErrors } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/index";
import { type TopicConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/topicTree";
import { type Topic } from "webviz-core/src/players/types";
import type { Namespace } from "webviz-core/src/types/Messages";

export const TOPIC_CONFIG = getGlobalHooks()
  .startupPerPanelHooks()
  .ThreeDimensionalViz.getDefaultTopicTree();

export const BASE_DATA_SOURCE_PREFIXES = ["", "/webviz_tables", "/labels_json"];
export const FEATURE_DATA_SOURCE_PREFIXES = ["/webviz_bag_2", "/webviz_tables_2"];
export const ALL_DATA_SOURCE_PREFIXES = [...BASE_DATA_SOURCE_PREFIXES, ...FEATURE_DATA_SOURCE_PREFIXES];
export const DEFAULT_GROUP_PREFIXES_BY_COLUMN = [BASE_DATA_SOURCE_PREFIXES, FEATURE_DATA_SOURCE_PREFIXES];

const BASE_COLUMN_ONLY_TOPICS = new Set(["/metadata", "/tf"]);
const DEFAULT_VISIBILITY_BY_COLUMN = [false, false];

// Only turn on two namespaces for map.
export const DEFAULT_METADATA_NAMESPACES = ["tiles", "intensity"];

export function getDefaultNewGroupItemConfig(displayName: string, topicNames: string[]): TopicGroupConfig {
  return {
    expanded: true,
    displayName,
    items: topicNames.map((topicName) => getDefaultTopicItemConfig(topicName)),
    // Turn both the base and feature visibility on by default.
    visibilityByColumn: [true, true],
  };
}

export function getDefaultTopicItemConfig(topicName: string): TopicItemConfig {
  const topicNameWithoutPrefix = removeTopicPrefixes([topicName])[0];
  const selectedNamespacesByColumn =
    topicNameWithoutPrefix === "/metadata" ? [DEFAULT_METADATA_NAMESPACES, []] : undefined;
  return {
    topicName: topicNameWithoutPrefix,
    // Turn the base topic visibility on by default.
    visibilityByColumn: [true, false],
    ...getSettingsByColumnWithDefaults(topicNameWithoutPrefix),
    ...(selectedNamespacesByColumn ? { selectedNamespacesByColumn } : undefined),
  };
}

type DisplayNameByTopic = { [topicName: string]: string };
type ErrorsByTopic = { [topicName: string]: string[] };
type NamespacesByTopic = { [topicName: string]: string[] };

export function removeTopicPrefixes(topicNames: string[]): string[] {
  const nonPrefixedNames = topicNames.map((name) => {
    for (const dataSourcePrefix of FEATURE_DATA_SOURCE_PREFIXES) {
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
    availableTopics,
    displayNameByTopic,
    errorsByTopic,
    namespacesByTopic,
    filterText,
    filteredKeysSet,
    hasFeatureColumn,
  }: {|
    displayNameByTopic: DisplayNameByTopic,
    namespacesByTopic: NamespacesByTopic,
    availableTopics: Topic[],
    errorsByTopic: ErrorsByTopic,
    filterText?: string,
    filteredKeysSet?: ?Set<string>,
    hasFeatureColumn?: boolean,
  |}
): TopicGroupType[] {
  const availableTopicNamesSet = new Set(availableTopics.map(({ name }) => name));
  const datatypeKeyByTopicName = mapValues(keyBy(availableTopics, "name"), "datatype");

  return groupsConfig.map(
    ({ items, visibilityByColumn: groupVisibilityByColumn = DEFAULT_VISIBILITY_BY_COLUMN, ...rest }, idx) => {
      const id = `${rest.displayName.split(" ").join("-")}_${idx}`;
      // Auto expand group in filtering mode.
      const isGroupExpanded = rest.expanded == null ? idx === 0 : rest.expanded || !!filterText;
      let isAnyTopicFiltered = false;

      const topicItems = items.map((topicItemConfig, idx1) => {
        const {
          displayName,
          topicName,
          selectedNamespacesByColumn = [],
          visibilityByColumn = DEFAULT_VISIBILITY_BY_COLUMN,
        } = topicItemConfig;

        let datatype;
        const errors = [];
        const prefixByColumn = getPrefixByColumn(topicName);
        const topicHasFeatureColumn = hasFeatureColumn && !BASE_COLUMN_ONLY_TOPICS.has(topicName);
        const topicDisplayVisibilityByColumn = topicHasFeatureColumn ? [undefined, undefined] : [undefined];
        const namespaceDisplayVisibilityByNamespace = {};
        visibilityByColumn.forEach((columnVisible, columnIdx) => {
          // Don't need to process feature column if no feature topics are available.
          if (!topicHasFeatureColumn && columnIdx > 0) {
            return;
          }
          const dataSourcePrefix = prefixByColumn[columnIdx];
          const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
          if (availableTopicNamesSet.has(prefixedTopicName)) {
            if (errorsByTopic[prefixedTopicName]) {
              const errorSource = dataSourcePrefix ? `(${dataSourcePrefix}) ` : "";
              errors.push(...errorsByTopic[prefixedTopicName].map((error) => `${errorSource}${error}`));
            }

            datatype = datatypeKeyByTopicName[prefixedTopicName];
            const badgeText = getBadgeTextByTopicName(prefixedTopicName);

            topicDisplayVisibilityByColumn[columnIdx] = {
              badgeText,
              isParentVisible: groupVisibilityByColumn[columnIdx],
              visible: columnVisible,
              available: true,
            };
            const isNamespaceParentVisible = groupVisibilityByColumn[columnIdx] && columnVisible;

            // Only show namespaces when the topic is available.
            (namespacesByTopic[prefixedTopicName] || []).forEach((ns) => {
              if (!namespaceDisplayVisibilityByNamespace[ns]) {
                namespaceDisplayVisibilityByNamespace[ns] = topicHasFeatureColumn
                  ? [undefined, undefined]
                  : [undefined];
              }
              namespaceDisplayVisibilityByNamespace[ns][columnIdx] = {
                isParentVisible: isNamespaceParentVisible,
                badgeText,
                // Make namespaces visible by default.
                visible:
                  selectedNamespacesByColumn[columnIdx] == null || selectedNamespacesByColumn[columnIdx].includes(ns),
                available: true,
              };
            });
          }
        });

        const displayNameWithFallback = displayName || displayNameByTopic[topicName];
        const isTopicShownInList =
          !filteredKeysSet ||
          (filteredKeysSet && (filteredKeysSet.has(topicName) || filteredKeysSet.has(displayNameWithFallback)));

        // Auto select group if any topic in this group is selected.
        if (isTopicShownInList) {
          isAnyTopicFiltered = true;
        }
        return {
          // Save the original config in order to save back to panelConfig.
          ...topicItemConfig,
          derivedFields: {
            displayName: displayNameWithFallback || topicName,
            id: `${id}_${idx1}`,
            isShownInList: isTopicShownInList,
            keyboardFocusIndex: -1,
            prefixByColumn,
            ...(isEqual(namespaceDisplayVisibilityByNamespace, {})
              ? undefined
              : { namespaceDisplayVisibilityByNamespace }),
            ...(isEqual(topicDisplayVisibilityByColumn, [undefined, undefined]) ||
            isEqual(topicDisplayVisibilityByColumn, [undefined])
              ? undefined
              : { displayVisibilityByColumn: topicDisplayVisibilityByColumn }),
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
        visibilityByColumn: groupVisibilityByColumn,
        derivedFields: {
          addTopicKeyboardFocusIndex: -1,
          expanded: isGroupExpanded,
          hasFeatureColumn: !!hasFeatureColumn,
          id,
          isShownInList: isGroupShownInList,
          keyboardFocusIndex: -1,
          prefixesByColumn: [BASE_DATA_SOURCE_PREFIXES, FEATURE_DATA_SOURCE_PREFIXES],
          ...(filterText ? { filterText } : undefined),
        },
        items: topicItems,
      };
    }
  );
}

export function updateFocusIndexesAndGetFocusData(
  topicGroups: TopicGroupType[]
): { topicGroups: TopicGroupType[], focusData: KeyboardFocusData[] } {
  // An array that maps focusIndexes to the objectPath and keyboard op type so that when keyboard op happens,
  // we can manipulate topicGroups data without iterating through all groups and topics.
  const focusData = [];
  const newTopicGroups = topicGroups.map((group, idx) => {
    const {
      items,
      derivedFields: { isShownInList, expanded },
    } = group;
    const newGroup = { ...group };
    // The first focusIndex is for the group.
    const groupFocusIndex = focusData.length;
    if (isShownInList) {
      focusData.push({ objectPath: `[${idx}]`, focusType: KEYBOARD_FOCUS_TYPES.GROUP });
    }
    // Only assign updated focusIndexes to visible topics
    const shouldAssignFocusIndexesToTopics = isShownInList && expanded;
    if (shouldAssignFocusIndexesToTopics) {
      newGroup.items = items.map((item, idx1) => {
        const newItem = { ...item };
        if (item.derivedFields.isShownInList) {
          newItem.derivedFields.keyboardFocusIndex = focusData.length;
          focusData.push({ objectPath: `[${idx}].items.[${idx1}]`, focusType: KEYBOARD_FOCUS_TYPES.TOPIC });
        }
        return newItem;
      });
    }

    if (isShownInList) {
      newGroup.derivedFields.keyboardFocusIndex = groupFocusIndex;
      if (shouldAssignFocusIndexesToTopics) {
        newGroup.derivedFields.addTopicKeyboardFocusIndex = focusData.length;
        // Add another focusIndex for `New topic` button at the bottom of each group.
        focusData.push({ objectPath: `[${idx}].items`, focusType: KEYBOARD_FOCUS_TYPES.NEW_TOPIC });
      }
    }
    return newGroup;
  });
  // Add focusIndex for `New Group` button at the bottom of all groups.
  focusData.push({ objectPath: "", focusType: KEYBOARD_FOCUS_TYPES.NEW_GROUP });
  return { topicGroups: newTopicGroups, focusData };
}

export function addIsKeyboardFocusedToTopicGroups(topicGroups: TopicGroupType[], focusIndex: number): TopicGroupType[] {
  return topicGroups.map((group) => ({
    ...group,
    derivedFields:
      group.derivedFields.keyboardFocusIndex === focusIndex
        ? {
            ...group.derivedFields,
            isKeyboardFocused: true,
          }
        : group.derivedFields,
    items: group.items.map((item) => ({
      ...item,
      derivedFields:
        item.derivedFields.keyboardFocusIndex === focusIndex
          ? { ...item.derivedFields, isKeyboardFocused: true }
          : item.derivedFields,
    })),
  }));
}

export function getOnTopicGroupsChangeDataByKeyboardOp({
  focusItemOp,
  topicGroups,
  focusData,
  focusIndex,
  isShiftKeyPressed,
}: {
  focusItemOp: FocusItemOp,
  topicGroups: TopicGroupType[],
  focusData: KeyboardFocusData[],
  focusIndex: number,
  isShiftKeyPressed: ?boolean,
}): ?{|
  focusType: KeyboardFocusType,
  objectPath: string,
  newValue?: boolean | ?VisibilityByColumn | TopicGroupType | TopicItem,
  unhandledFocusItemOp?: FocusItemOp,
|} {
  // Current no op is supported when focusIndex is -1, add more if needed
  if (focusIndex === -1) {
    return;
  }
  const focusDataItem = focusData[focusIndex];
  if (!focusDataItem) {
    throw new Error(`focusIndex ${focusIndex} should map to objectPath and focusType.`);
  }
  const { objectPath, focusType } = focusDataItem;
  switch (focusType) {
    case "GROUP":
      {
        const maybeGroup: ?TopicGroupType = get(topicGroups, objectPath);
        if (!maybeGroup) {
          throw new Error(`Not able to get topic group by ${objectPath}`);
        }
        if (focusItemOp === FOCUS_ITEM_OPS.Enter) {
          // toggle group visibility
          return isShiftKeyPressed
            ? {
                focusType,
                objectPath,
                newValue: keyboardToggleAllForGroupVisibility(maybeGroup),
              }
            : {
                focusType,
                objectPath: `${objectPath}.visibilityByColumn`,
                newValue: toggleVisibility(maybeGroup.visibilityByColumn || [false, false]),
              };
        } else if (focusItemOp === FOCUS_ITEM_OPS.ArrowRight && !maybeGroup.expanded) {
          // expand the group
          return { focusType, objectPath: `${objectPath}.expanded`, newValue: true };
        } else if (focusItemOp === FOCUS_ITEM_OPS.ArrowLeft && maybeGroup.expanded) {
          // collapse the group only if the filterText is valid since we auto expand the group when filtering
          if (!maybeGroup.derivedFields.filterText) {
            return { focusType, objectPath: `${objectPath}.expanded`, newValue: false };
          }
        } else if (focusItemOp === FOCUS_ITEM_OPS.Backspace) {
          // delete the group
          return { focusType, objectPath, newValue: undefined, unhandledFocusItemOp: focusItemOp };
        }
      }
      break;
    case "NEW_GROUP":
      if (focusItemOp === FOCUS_ITEM_OPS.Enter) {
        // Return the op directly to be handled in the UI
        return { focusType, objectPath, unhandledFocusItemOp: focusItemOp };
      }
      break;
    case "TOPIC":
      {
        const maybeTopic: ?TopicItem = get(topicGroups, objectPath);
        if (!maybeTopic) {
          throw new Error(`Not able to get topic by ${objectPath}`);
        }
        if (focusItemOp === FOCUS_ITEM_OPS.Enter) {
          // toggle topic visibility
          return isShiftKeyPressed
            ? {
                focusType,
                objectPath,
                newValue: keyboardToggleAllForTopicVisibility(maybeTopic),
              }
            : {
                focusType,
                objectPath: `${objectPath}.visibilityByColumn`,
                newValue: toggleVisibility(maybeTopic.visibilityByColumn || [false, false]),
              };
        } else if (focusItemOp === FOCUS_ITEM_OPS.ArrowRight && !maybeTopic.expanded) {
          // expand the topic
          return { focusType, objectPath: `${objectPath}.expanded`, newValue: true };
        } else if (focusItemOp === FOCUS_ITEM_OPS.ArrowLeft && maybeTopic.expanded) {
          // collapse the topic
          return { focusType, objectPath: `${objectPath}.expanded`, newValue: false };
        } else if (focusItemOp === FOCUS_ITEM_OPS.Backspace) {
          // delete the topic
          return { focusType, objectPath, newValue: undefined, unhandledFocusItemOp: focusItemOp };
        }
      }
      break;
    case "NEW_TOPIC":
      if (focusItemOp === FOCUS_ITEM_OPS.Enter) {
        // Return the op directly to be handled in the UI
        return { focusType, objectPath, unhandledFocusItemOp: focusItemOp };
      }
      break;
    default:
      (focusType: empty);
      throw new Error(`${focusType} is not supported.`);
  }
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
export function getBadgeTextByTopicName(topicName: string): string {
  if (topicName.startsWith("/webviz_bag_2")) {
    return "B2";
  } else if (topicName.startsWith("/webviz_tables_2")) {
    return "T2";
  } else if (topicName.startsWith("/tables")) {
    return "T1";
  } else if (topicName.startsWith("/labels_json_2")) {
    return "L2";
  } else if (topicName.startsWith("/labels_json")) {
    return "L1";
  }
  return "B1";
}
function getPrefixByColumn(topicName: string): string[] {
  if (topicName.startsWith("/tables/") || topicName.startsWith("/webviz_tables_2/")) {
    return ["", "/webviz_tables_2"];
  } else if (topicName.startsWith("/labels_json/")) {
    return ["", "/labels_json_2"];
  }
  return ["", "/webviz_bag_2"];
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
  topicGroupsConfig.forEach(({ visibilityByColumn: groupVisibilityByColumn = DEFAULT_VISIBILITY_BY_COLUMN, items }) => {
    items.forEach(
      ({
        topicName,
        visibilityByColumn: topicVisibilityByColumn = DEFAULT_VISIBILITY_BY_COLUMN,
        settingsByColumn,
        selectedNamespacesByColumn,
      }) => {
        const prefixByColumn = getPrefixByColumn(topicName);
        for (let i = 0; i < prefixByColumn.length; i++) {
          // No need to process if the group prefix is not visible.
          if (!groupVisibilityByColumn[i]) {
            continue;
          }
          const dataSourcePrefix = prefixByColumn[i];
          const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
          const isTopicVisible = topicVisibilityByColumn[i];
          if (isTopicVisible) {
            selectedTopicNames.push(prefixedTopicName);
          }
          // Only need to set namespaces for the selected and visible topics.
          if (selectedNamespacesByColumn && isTopicVisible && selectedNamespacesByColumn[i]) {
            selectedNamespacesByTopic[prefixedTopicName] = selectedNamespacesByColumn[i];
          }
        }
        if (!settingsByColumn) {
          return;
        }
        settingsByColumn.forEach((settings, settingsColIdx) => {
          const dataSourcePrefix = prefixByColumn[settingsColIdx];
          if (settings && dataSourcePrefix != null) {
            const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
            selectedTopicSettingsByTopic[prefixedTopicName] = settings;
          }
        });
      }
    );
  });
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

// Remove any white spaces in the inputText when generating topic names.
export function removeBlankSpaces(inputText: string): string {
  return inputText.replace(/\s/g, "");
}
