// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { intersection } from "lodash";

import filterMap from "webviz-core/src/filterMap";
import {
  getFlattenedTreeNodes,
  TOPIC_CONFIG,
  removeTopicPrefixes,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsUtils";
import {
  type TopicDisplayMode,
  TOPIC_DISPLAY_MODES,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/TopicDisplayModeSelector";
import { type TopicConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/topicTree";
import { TopicTreeNode } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/treeBuilder";
import type { Topic } from "webviz-core/src/players/types";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";
import { getTopicPrefixes } from "webviz-core/src/util/selectors";

export const BAG1_TOPIC_GROUP_NAME = "Bag";
export const BAG2_TOPIC_GROUP_NAME = `Bag 2 ${SECOND_BAG_PREFIX}`;

export function getCheckedTopicsAndExtensions(
  checkedNodes: string[]
): { selectedTopicsSet: Set<string>, selectedExtensionsSet: Set<string> } {
  const selectedExtensionsSet = new Set();
  const selectedTopicsSet = new Set();

  checkedNodes.forEach((item) => {
    if (item.startsWith("t:")) {
      selectedTopicsSet.add(item.substr("t:".length));
    } else if (item.startsWith("/")) {
      selectedTopicsSet.add(item);
    } else if (item.startsWith("x:")) {
      selectedExtensionsSet.add(item.substr("x:".length));
    }
  });
  return { selectedExtensionsSet, selectedTopicsSet };
}

// check if we need to turn on any group names, return the original checkedNodes if not
export function getNewCheckedNodes(selectedAndAvailableTopics: string[], checkedNodes: string[]): string[] {
  let newCheckedNodes = checkedNodes;
  const hasBag1Topics = selectedAndAvailableTopics.some((topic) => !topic.startsWith(SECOND_BAG_PREFIX));
  const hasBag2Topics = selectedAndAvailableTopics.some((topic) => topic.startsWith(SECOND_BAG_PREFIX));
  if (hasBag1Topics && !checkedNodes.includes(`name:${BAG1_TOPIC_GROUP_NAME}`)) {
    newCheckedNodes = [...checkedNodes, `name:${BAG1_TOPIC_GROUP_NAME}`];
  }
  if (hasBag2Topics && !checkedNodes.includes(`name:${BAG2_TOPIC_GROUP_NAME}`)) {
    newCheckedNodes = [...newCheckedNodes, `name:${BAG2_TOPIC_GROUP_NAME}`];
  }
  return newCheckedNodes;
}

// get the treeConfig based on various inputs
// add 'name:Bag' and 'name:Bag 2 /webviz_bag_2' to checkedNodes if needed
export function getTopicConfig({
  checkedNodes,
  topicDisplayMode,
  topics,
  supportedMarkerDatatypes,
}: {
  checkedNodes: string[],
  topicDisplayMode: TopicDisplayMode,
  topics: Topic[],
  supportedMarkerDatatypes: string[],
}): { topicConfig: TopicConfig, newCheckedNodes: string[] } {
  const newCheckedNodes = checkedNodes;
  const showFlattened = topicDisplayMode !== TOPIC_DISPLAY_MODES.SHOW_TREE.value;
  const showSelected = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_SELECTED.value;
  const showAvailable = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_AVAILABLE.value;
  const showAll = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_ALL.value;
  const supportedMarkerDatatypesSet = new Set(supportedMarkerDatatypes);
  if (!showFlattened) {
    return { topicConfig: TOPIC_CONFIG, newCheckedNodes };
  }

  // filter out topic datatypes that are not supported in the 3D panel
  const availableTopicsNames = topics
    .filter((topic) => supportedMarkerDatatypesSet.has(topic.datatype))
    .map((topic) => topic.name);

  const topicPrefixes = getTopicPrefixes(availableTopicsNames);
  const hasMultiBag = topicPrefixes.length > 0;
  const { selectedTopicsSet, selectedExtensionsSet } = getCheckedTopicsAndExtensions(checkedNodes);

  const selectedAndAvailableTopics = intersection([...selectedTopicsSet], availableTopicsNames);
  const selectedAvailableTopicsWithoutPrefix = removeTopicPrefixes(selectedAndAvailableTopics);
  const availableTopicsWithoutPrefix = removeTopicPrefixes(availableTopicsNames);
  let flattenedTopicNodes = getFlattenedTreeNodes(TOPIC_CONFIG);

  if (showSelected) {
    // show checked and available topics
    flattenedTopicNodes = filterMap(flattenedTopicNodes, (item) => {
      if (item.topic) {
        // use the topics without prefix so that if one topic is checked in one of the bags
        // the corresponding topic in other bags will be visible as well
        return selectedAvailableTopicsWithoutPrefix.includes(item.topic) ? item : null;
      }
      if (item.extension) {
        return selectedExtensionsSet.has(item.extension) ? item : null;
      }
      return null;
    });
  } else if (showAvailable) {
    const availableTopicsWithoutPrefixSet = new Set(availableTopicsWithoutPrefix);

    flattenedTopicNodes = filterMap(flattenedTopicNodes, (item) => {
      if (item.topic) {
        return availableTopicsWithoutPrefixSet.has(item.topic) ? item : null;
      }
      return item;
    });
  }

  const topicConfigTopicNames = new Set(filterMap(flattenedTopicNodes, (node) => (node.topic ? node.topic : null)));

  // to make sure we can toggle topics between bag1 and bag2, always show the uncategorized
  // topics across multiple bags so long they are available in one of the bags
  const uncategorizedNodes = (showSelected ? selectedAvailableTopicsWithoutPrefix : availableTopicsWithoutPrefix)
    .filter((topic) => !topicConfigTopicNames.has(topic))
    .map((topic) => ({ topic, name: topic }));

  flattenedTopicNodes.push(...uncategorizedNodes);

  // TF node doesn't associate with any topic, we want to show it conditionally based on the display mode
  const tfNode =
    showAll || (showAvailable && topics.length > 0) || (showSelected && checkedNodes.includes("name:TF"))
      ? [{ name: "TF", children: [], description: "Visualize relationships between /tf frames." }]
      : [];

  // return flattened nodes directly for a single bag

  if (!hasMultiBag) {
    return {
      topicConfig: {
        ...TOPIC_CONFIG,
        children: [...flattenedTopicNodes, ...tfNode],
      },
      newCheckedNodes: checkedNodes,
    };
  }

  let bag1Children = [...flattenedTopicNodes, ...tfNode];
  let bag2Children = filterMap(flattenedTopicNodes, (item) => {
    if (!item.topic) {
      return null;
    }
    return ({ ...item, topic: `${SECOND_BAG_PREFIX}${item.topic}` }: TopicConfig);
  });

  // show only the selected topics at each bag
  if (showSelected) {
    bag1Children = bag1Children.filter((node) => (node.topic ? selectedTopicsSet.has(node.topic) : true));
    bag2Children = bag2Children.filter((node) => (node.topic ? selectedTopicsSet.has(node.topic) : true));
  }

  // construct two topic groups for two bags
  const topicConfig = {
    name: "root",
    children: [
      {
        name: BAG1_TOPIC_GROUP_NAME,
        children: bag1Children,
      },
      {
        name: BAG2_TOPIC_GROUP_NAME,
        children: bag2Children,
      },
    ],
  };

  return {
    topicConfig,
    newCheckedNodes: getNewCheckedNodes(selectedAndAvailableTopics, checkedNodes),
  };
}

// traverse once through the flat topic nodes and set visibility based on hiddenTopics
export function setVisibleByHiddenTopics(flatListTree: TopicTreeNode, hiddenTopics: string[]): void {
  if (flatListTree.children) {
    flatListTree.children.forEach((child) => {
      if (child.topic) {
        // update visible field after finding a topic match
        child.visible = !hiddenTopics.includes(child.topic);
      }
      // continue to set visibility for two bags
      setVisibleByHiddenTopics(child, hiddenTopics);
    });
  }
}
