// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { omit, flatten } from "lodash";
import microMemoize from "micro-memoize";

import type { TopicRowItemConfig, TopicRowItem, TopicGroupConfig, TopicGroupType } from "./types";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type TopicConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/topicTree";

type DisplayNameMap = { [uniqueName: string]: string };

export const TOPIC_CONFIG = getGlobalHooks()
  .perPanelHooks()
  .ThreeDimensionalViz.getDefaultTopicTree();

// generate individual TopicRowItem by config
// TODO(Audrey): add settings, data sourceBadges and differentiate between selected/unselected and enabled/disabled
export function getItem(config: TopicRowItemConfig, id: string, mappedDisplayName: ?string): ?TopicRowItem {
  switch (config.type) {
    case "TOPIC":
      return { ...config, id, displayName: mappedDisplayName || config.topicName, disableMultiSelection: false };
    case "TF":
      return { ...config, id, displayName: mappedDisplayName || config.tfId, disableMultiSelection: true };
    case "MAP":
      return { ...config, id, displayName: mappedDisplayName || config.mapId, disableMultiSelection: true };
    default:
  }
}

// generate topicGroups data for the UI
export function getTopicGroupsByConfig(
  groupsConfig: TopicGroupConfig[],
  displayNameMap: DisplayNameMap
): TopicGroupType[] {
  return groupsConfig.map(({ displayName, selected, expanded, items = [] }, idx) => {
    const id = `${displayName}_${idx}`;
    return {
      id,
      displayName,
      selected,
      expanded,
      items: items
        .map((itemConfig, idx1) => {
          // $FlowFixMe  don't need to check each type to get the displayNameKey
          const displayNameKey: ?string = itemConfig.topicName || itemConfig.mapId;
          const mappedDisplayName = displayNameKey ? displayNameMap[displayNameKey] : null;
          return getItem(itemConfig, `${id}_${idx1}`, mappedDisplayName);
        })
        .filter(Boolean),
    };
  });
}

// traverse the tree and flatten the children items in the topicConfig
function* flattenItem(item: TopicConfig, name: string) {
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
// memoize the flattened nodes since it only needs to be computed once
export const getFlattenedTreeNodes = microMemoize((topicConfig) => {
  return flatten(topicConfig.children.map((item) => Array.from(flattenItem(item, item.name || ""))));
});

// generate a map based on topicTree config, so we can map a topicName or map id to a preconfigured name
export const buildItemDisplayNameMap = microMemoize(
  (topicConfig: ?TopicConfig): DisplayNameMap => {
    const flattenedTopicNodes = getFlattenedTreeNodes(topicConfig || TOPIC_CONFIG);
    return flattenedTopicNodes.reduce((memo, node) => {
      const key = node.topic || node.extension;
      if (key) {
        memo[key] = node.name;
      }
      return memo;
    }, {});
  }
);
