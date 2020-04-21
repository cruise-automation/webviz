// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniq, flatten } from "lodash";
import microMemoize from "micro-memoize";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type TopicConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/topicTree";

const TOPIC_CONFIG = getGlobalHooks()
  .startupPerPanelHooks()
  .ThreeDimensionalViz.getDefaultTopicTree();

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

export function toTopicTreeV2Nodes(nodes: string[]): string[] {
  const newNodes = [];
  for (const item of nodes) {
    // Add `/t` prefix
    if (item.startsWith("/")) {
      newNodes.push(`t:${item}`);
    } else if (item.startsWith("x:")) {
      // Convert tf and metadata extensions to namespace selections.
      if (item.startsWith("x:TF.")) {
        newNodes.push(`ns:/tf:${item.substr("x:TF.".length)}`);
      } else if (item === "x:tiles") {
        // Convert map tile name node to /metadata topic node.
        newNodes.push("t:/metadata");
        newNodes.push("ns:/metadata:tiles");
      } else {
        newNodes.push(`ns:/metadata:${item.substr("x:".length)}`);
      }
    } else if (!item.startsWith("t:") && !item.startsWith("ns:") && !item.startsWith("name:")) {
      // And name prefix for name nodes which sometimes may not have any prefix.
      newNodes.push(`name:${item}`);
    } else if (item === "name:TF") {
      // Convert TF name node to /tf topic node.
      newNodes.push("t:/tf");
    } else {
      newNodes.push(item);
    }
  }
  return uniq(migrateLegacyIds(newNodes));
}

export function fromTopicTreeV2Nodes(nodes: string[]): string[] {
  const newNodes = [];
  for (const item of nodes) {
    if (item.startsWith("ns:/tf:")) {
      newNodes.push(`x:TF.${item.substr("ns:/tf:".length)}`);
    } else if (item.startsWith("ns:/metadata:")) {
      // No need to push `ns:/metadata:tiles` to newNodes.
      if (item !== "ns:/metadata:tiles") {
        newNodes.push(`x:${item.substr("ns:/metadata:".length)}`);
      }
    } else if (item === "t:/metadata") {
      newNodes.push("x:tiles");
    } else if (item === "t:/tf") {
      newNodes.push("name:TF");
    } else {
      newNodes.push(item);
    }
  }
  return uniq(migrateLegacyIds(newNodes));
}

export function addDefaultTopicSettingsForTopicTree(topicSettings: any): any {
  const newTopicSettings = { ...topicSettings };
  const getDefaultSettingsHook = getGlobalHooks().startupPerPanelHooks().ThreeDimensionalViz.getDefaultSettings;
  if (!getDefaultSettingsHook) {
    return topicSettings;
  }
  const defaultSettings = getDefaultSettingsHook();
  // Merge the defaultSettings with the existing topicSettings if it's not already set.
  Object.keys(defaultSettings).forEach((topicName) => {
    if (!newTopicSettings[topicName]) {
      newTopicSettings[topicName] = defaultSettings[topicName];
    }
  });
  return newTopicSettings;
}
