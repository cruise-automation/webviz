// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { type Save3DConfig } from "../index";
import { type TopicDisplayMode as DisplayMode } from "./TopicViewModeSelector";
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/index";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { Topic } from "webviz-core/src/players/types";

export type TopicDisplayMode = DisplayMode;
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
  featureKey: string,
  parentKey?: string,
  available: boolean,
  // Whether the data providers are available. If it is and the current node is not available, we'll show
  // the node name being striked through in the UI.
  providerAvailable: boolean,
  // eslint-disable-next-line
  children: TreeNode[],
|};
export type TreeTopicNode = {|
  type: "topic",
  topicName: string,
  key: string,
  featureKey: string,
  parentKey?: string,
  name?: string,
  datatype?: string,
  description?: string,
  providerAvailable: boolean,
  available: boolean,
|};

export type TreeNode = TreeGroupNode | TreeTopicNode;

export type UseSceneBuilderAndTransformsDataInput = {|
  sceneBuilder: SceneBuilder,
  staticallyAvailableNamespacesByTopic: NamespacesByTopic,
  transforms: Transforms,
|};

export type SceneErrorsByKey = { [topicName: string]: string[] };

export type UseSceneBuilderAndTransformsDataOutput = {|
  availableNamespacesByTopic: NamespacesByTopic,
  sceneErrorsByKey: SceneErrorsByKey,
|};

export type UseTreeInput = {|
  availableNamespacesByTopic: NamespacesByTopic,
  checkedKeys: string[],
  defaultTopicSettings: { [topicName: string]: any },
  expandedKeys: string[],
  expandedKeys: string[],
  filterText: string,
  modifiedNamespaceTopics: string[],
  providerTopics: Topic[], // Only changes when e.g. dragging in a new bag.
  saveConfig: Save3DConfig,
  sceneErrorsByTopicKey: SceneErrorsByKey,
  topicDisplayMode: TopicDisplayMode,
  topicSettings: { [topicName: string]: any },
  topicTreeConfig: TopicV2Config, // Never changes!
|};

export type GetIsTreeNodeVisibleInScene = (topicNode: TreeNode, namespaceKey?: string) => boolean;
export type GetIsTreeNodeVisibleInTree = (key: string) => boolean;
export type SetCurrentEditingTopic = (?Topic) => void;
export type ToggleNode = (nodeKey: string, namespaceParentTopicName?: string) => void;
export type ToggleNamespaceChecked = ({| topicName: string, namespaceKey: string |}) => void;
export type GetIsNamespaceCheckedByDefault = (topicName: string) => boolean;
export type DerivedCustomSettings = {| overrideColor?: string, isDefaultSettings: boolean |};
export type DerivedCustomSettingsByKey = { [key: string]: DerivedCustomSettings };

export type UseTreeOutput = {|
  // Instead of precomputing visible states for all nodes, pass the function down to the nodes
  // so that only rendered nodes' visibility is computed since we support virtualization in the tree.
  getIsTreeNodeVisibleInScene: GetIsTreeNodeVisibleInScene,
  getIsTreeNodeVisibleInTree: GetIsTreeNodeVisibleInTree,
  getIsNamespaceCheckedByDefault: GetIsNamespaceCheckedByDefault,
  hasFeatureColumn: boolean,
  // For testing.
  nodesByKey: { [key: string]: TreeNode },
  toggleCheckAllAncestors: ToggleNode,
  toggleCheckAllDescendants: ToggleNode,
  toggleNamespaceChecked: ToggleNamespaceChecked,
  toggleNodeChecked: ToggleNode,
  toggleNodeExpanded: ToggleNode,
  rootTreeNode: TreeNode,
  selectedNamespacesByTopic: { [topicName: string]: string[] },
  selectedTopicNames: string[],
  derivedCustomSettingsByKey: DerivedCustomSettingsByKey,
  sceneErrorsByKey: SceneErrorsByKey,
  allKeys: string[],
  shouldExpandAllKeys: boolean,
|};

export type EditingTopic = {|
  name: string,
  datatype: string,
|};
