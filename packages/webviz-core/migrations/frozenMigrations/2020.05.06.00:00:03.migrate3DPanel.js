// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten, cloneDeep, omit, uniq } from "lodash";
import microMemoize from "micro-memoize";

import getPanelTypeFromId from "webviz-core/migrations/frozenHelpers/getPanelTypeFromId";

const THREE_DIMENSIONAL_SAVED_PROPS_VERSION = 17;

export type TopicTreeConfig = {|
  name?: string,
  // displayName is only used to maintain TopicGroups flow type.
  displayName?: string,
  topicName?: string,
  children?: TopicTreeConfig[],
  description?: string,

  // Previous names or ids for this item under which it might be saved in old layouts.
  // Used for automatic conversion so that old saved layouts continue to work when tree nodes are renamed.
  legacyIds?: string[],
|};

export const TOPIC_CONFIG: TopicTreeConfig = {
  name: "root",
  children: [
    { name: "TF", topicName: "/tf", children: [], description: "Visualize relationships between /tf frames." },
  ],
};

// DUPLICATED from webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsMigrations.js
type LegacyIdItem = {| legacyId: string, topic: string |} | {| legacyId: string, name: string |};

// DUPLICATED from webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsMigrations.js
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

// DUPLICATED from webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsMigrations.js
const getLegacyIdItems = microMemoize(
  (topicConfig): LegacyIdItem[] => {
    return flatten(topicConfig.children.map((item) => Array.from(generateLegacyIdItems(item))));
  }
);

// DUPLICATED from webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsMigrations.js
export function migrateLegacyIds(checkedKeys: string[], topicTreeConfig: TopicTreeConfig): string[] {
  const legacyIdItems = getLegacyIdItems(topicTreeConfig);
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

export function toTopicTreeNodes(nodes: string[], topicTreeConfig: TopicTreeConfig): string[] {
  const newNodes = [];
  for (const item of nodes) {
    // Add `/t` prefix
    if (item.startsWith("/")) {
      newNodes.push(`t:${item}`);
    } else if (item.startsWith("x:")) {
      // Convert tf and metadata extensions to namespace selections.
      if (item.startsWith("x:TF.")) {
        // Igonore the "empty" TF.
        if (item !== "x:TF.") {
          newNodes.push(`ns:/tf:${item.substr("x:TF.".length)}`);
        }
      } else if (item === "x:tiles") {
        // Convert map tile group node to /metadata topic node.
        newNodes.push("t:/metadata");
        newNodes.push("ns:/metadata:tiles");
      } else {
        newNodes.push(`ns:/metadata:${item.substr("x:".length)}`);
      }
    } else if (
      !item.startsWith("t:") &&
      !item.startsWith("ns:") &&
      !item.startsWith("name:") &&
      !item.startsWith("name_2:")
    ) {
      // And name prefix for group nodes which sometimes may not have any prefix.
      newNodes.push(`name:${item}`);
    } else if (item === "name:TF") {
      // Convert TF group node to /tf topic node.
      newNodes.push("t:/tf");
    } else {
      newNodes.push(item);
    }
  }
  return uniq(migrateLegacyIds(newNodes, topicTreeConfig));
}

function migrate3DPanelFn(originalConfig: any): any {
  let config = originalConfig;

  if (config.savedPropsVersion === THREE_DIMENSIONAL_SAVED_PROPS_VERSION) {
    return config;
  }
  if (!config.savedPropsVersion || config.savedPropsVersion < 16) {
    // Rename checked/expandedNodes to checked/expandedKeys
    config = {
      ...originalConfig,
      checkedKeys: originalConfig.checkedNodes || originalConfig.checkedKeys || [],
      expandedKeys: originalConfig.expandedNodes || originalConfig.expandedKeys || [],
    };
    // Remove legacy savedProps.
    config = omit(config, ["checkedNodes", "expandedNodes", "topicGroups", "hideMap", "useHeightMap", "follow"]);
  }
  const { savedPropsVersion, checkedKeys, expandedKeys } = config;

  let newCheckedKeys = [...checkedKeys];
  let newExpandedKeys = [...expandedKeys];
  if (!savedPropsVersion || savedPropsVersion < 17) {
    newCheckedKeys = toTopicTreeNodes(newCheckedKeys, TOPIC_CONFIG);
    newExpandedKeys = toTopicTreeNodes(newExpandedKeys, TOPIC_CONFIG);
  }

  return {
    ...config,
    checkedKeys: newCheckedKeys,
    expandedKeys: newExpandedKeys,
    savedPropsVersion: THREE_DIMENSIONAL_SAVED_PROPS_VERSION,
  };
}

export function migrate3DPanelSavedProps(migrateFn: (any) => any) {
  return function(originalPanelsState: any): any {
    if (!originalPanelsState.savedProps) {
      return originalPanelsState;
    }
    const panelsState = cloneDeep(originalPanelsState);
    for (const id of Object.keys(panelsState.savedProps)) {
      if (getPanelTypeFromId(id) === "3D Panel") {
        const oldSavedProps = panelsState.savedProps[id];
        panelsState.savedProps[id] = migrateFn(oldSavedProps);
      }
    }
    return panelsState;
  };
}

export default migrate3DPanelSavedProps(migrate3DPanelFn);
