// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/index";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { Topic } from "webviz-core/src/players/types";

export type TopicV2Config = {|
  name?: string,
  displayName?: string,
  topicName?: string,
  children?: TopicV2Config[],
  description?: string,

  // Previous names or ids for this item under which it might be saved in old layouts.
  // Used for automatic conversion so that old saved layouts continue to work when tree nodes are renamed.
  legacyIds?: string[],
|};

export type NamespacesByTopic = { [topicName: string]: string[] };

export type TreeGroupNode = {|
  type: "group",
  name: string,
  key: string,
  parentKey?: string,
  // eslint-disable-next-line
  children: TreeNode[],
|};
type TreeTopicNode = {|
  type: "topic",
  topicName: string,
  key: string,
  parentKey?: string,
  name?: string,
  datatype?: string,
|};

export type TreeNode = TreeGroupNode | TreeTopicNode;

export type UseSceneBuilderAndTransformsDataInput = {|
  sceneBuilder: SceneBuilder,
  transforms: Transforms,
  staticallyAvailableNamespacesByTopic: NamespacesByTopic,
|};
export type UseSceneBuilderAndTransformsDataOutput = {|
  availableNamespacesByTopic: NamespacesByTopic,
|};

export type UseTreeInput = {|
  topicTreeConfig: TopicV2Config, // Never changes!
  providerTopics: Topic[], // Only changes when e.g. dragging in a new bag.
  checkedKeys: string[],
  modifiedNamespaceTopics: ?(string[]),
  topicSettings: { [topicName: string]: any },
  // transforms: Transforms, // Only changes a bit in the beginning of playback (can memoize using useShallowMemoize).
  // scenebuilderData: ScenebuilderData, // Only changes after turning a topic on/off, but then it stays the same.
  // panelConfigData: PanelConfigData,
  // filterText: string // Changes on every keystroke, but okay to debounce using `useDebounce`.
|};
export type UseTreeOutput = {|
  // allAncestorsCheckedKeysSet: Set<string>,
  // availableKeysSet: Set<string>,
  // checkedKeysSet: Set<string>,
  // expandedKeys: string[],
  hasFeatureColumn: boolean,
  selectedNamespacesByTopic: { [topicName: string]: string[] },
  selectedTopicNames: string[],
  settingsChangedKeysSet: Set<string>,
  rootTreeNode: TreeNode,
|};

export type EditingTopic = {|
  name: string,
  datatype: string,
|};
