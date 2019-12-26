// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual, sortBy } from "lodash";

import { ALL_DATA_SOURCE_PREFIXES, removeTopicPrefixes } from "./topicGroupsUtils";
import type { TopicGroupConfig } from "./types";

function getSelectionsFromCheckedNodes(
  checkedNodes: string[]
): {
  selectedTopics: string[],
  selectedExtensions: string[],
  selectedNamespacesByTopic: { [topicName: string]: string[] },
} {
  const selectedExtensions = [];
  const selectedTopics = [];
  const selectedNamespacesByTopic = {};
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
    }
  });
  return { selectedExtensions, selectedTopics, selectedNamespacesByTopic };
}

// Create a new topic group called 'My Topic Group' and related fields based the old config
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
      selected: true,
      expanded: true,
      items: [],
    };
  }

  const { selectedExtensions, selectedTopics, selectedNamespacesByTopic } = getSelectionsFromCheckedNodes(checkedNodes);
  const nonPrefixedTopics = removeTopicPrefixes(selectedTopics);

  let items = nonPrefixedTopics.map((topicName) => {
    let visibilitiesBySource;
    let settingsBySource;
    let selectedNamespacesBySource;
    for (const dataSourcePrefix of ALL_DATA_SOURCE_PREFIXES) {
      const prefixedTopicName = `${dataSourcePrefix}${topicName}`;
      if (selectedTopics.includes(prefixedTopicName)) {
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

    return {
      topicName,
      ...(settingsBySource ? { settingsBySource } : undefined),
      // no need to store the default visibilitiesBySource in panelConfig
      ...(!visibilitiesBySource || isEqual(visibilitiesBySource, { "": true }) ? undefined : { visibilitiesBySource }),
      ...(selectedNamespacesBySource ? { selectedNamespacesBySource } : undefined),
    };
  });

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
    selected: true,
    expanded: true,
    items,
  };
}
