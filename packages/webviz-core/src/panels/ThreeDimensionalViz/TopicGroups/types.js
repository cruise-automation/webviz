// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MessageCollector from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/MessageCollector";
import { type Topic } from "webviz-core/src/players/types";

export type KeyboardFocusType = "GROUP" | "NEW_GROUP" | "TOPIC" | "NEW_TOPIC" | "NAMESPACE";
export type KeyboardFocusData = {| objectPath: string, focusType: KeyboardFocusType |};
export type FocusItemOp = "Enter" | "ArrowLeft" | "ArrowRight" | "Backspace" | "ArrowUp" | "ArrowDown";

export type SceneCollectors = { [string]: MessageCollector };
export type OnTopicGroupsChange = (objectPath: string, newValue: any) => void;

export type VisibilityByColumn = boolean[];
// Select all namespaces if the item is undefined, and select none if it's `[]`
export type NamespacesByColumn = (?(string[]))[];
export type SettingsByColumn = any[];

type DisplayVisibility = {|
  isParentVisible: boolean,
  badgeText: string,
  visible: boolean,
  available: boolean,
|};

export type TopicItemConfig = {|
  displayName?: string,
  topicName: string,
  expanded?: boolean, // if true, namespaces will be expanded
  selectedNamespacesByColumn?: NamespacesByColumn,
  settingsByColumn?: any[],
  visibilityByColumn?: boolean[],
|};

export type NamespaceItem = {|
  namespace: string,
  isKeyboardFocused?: boolean,
  keyboardFocusIndex: number,
  displayVisibilityByColumn: (?DisplayVisibility)[],
|};

type DerivedTopicItemFields = {|
  id: string,
  // An index number to map the keyboard operations (up/down arrow) to the topic item.
  keyboardFocusIndex: number,
  // Datatypes we detected from the available topics at the high level after starting to play a bag.
  // We'll use it to derive the topic settings and topic icons.
  datatype?: string,
  // A displayName for people for better glancing and understanding.
  displayName: string,
  // Errors collected from the SceneBuilder for this topic.
  errors?: string[],
  // User-typed filterText used for text highlighting downstream, added here to avoid passing down as props since we already
  // update topicGroups based on filterText.
  filterText?: string,
  // Check if the currently focusedIndex is the same as the topic's `keyboardFocusIndex`, set it to be true if it is the same.
  // Adding it here to avoid passing down as props.
  isKeyboardFocused?: boolean,
  // Set `isShownInList` to false if the topicName does not match with the filterText.
  isShownInList: boolean,
  // TODO(Audrey): support 2nd bag for map and tf with `disableMultiSelection`
  prefixByColumn: string[],
  // Data for data source badge UI.
  displayVisibilityByColumn?: (?DisplayVisibility)[],
  // Store the sorted namespaces and add related display data for UI render.
  sortedNamespaceDisplayVisibilityByColumn?: NamespaceItem[],
  // Store the availableNamespacesByColumn so we can use to compute when toggling single and all namespaces.
  availableNamespacesByColumn?: NamespacesByColumn,
|};

export type TopicItem = {|
  ...TopicItemConfig,
  derivedFields: DerivedTopicItemFields,
|};

type SharedTopicGroupConfig = {|
  displayName: string,
  expanded?: boolean,
  visibilityByColumn?: boolean[],
|};
export type TopicGroupConfig = {|
  ...SharedTopicGroupConfig,
  items: TopicItemConfig[],
|};

type TopicGroupDerivedFields = {|
  id: string,
  // An index number to map the keyboard operations (up/down arrow) to adding topic at the bottom of each group.
  addTopicKeyboardFocusIndex: number,
  // Computed expanded value based on config and filtering mode (auto expand while filtering).
  expanded: boolean,
  // Check if the currently focusedIndex is the same as the group's `keyboardFocusIndex`, set it to be true if it is the same.
  isKeyboardFocused?: boolean,
  // User-typed filterText used for text highlighting downstream, added here to avoid passing down as props since we already
  // update topicGroups based on filterText.
  filterText?: string,
  // Set `isShownInList` to false if the group displayName or none of the topic names match with the filterText.
  isShownInList: boolean,
  // An index number to map the keyboard operations (up/down arrow) to the group item.
  keyboardFocusIndex: number,
  // Each column represents a list of prefixes for the topics in this column.
  prefixesByColumn: string[][],
  // Set to true if any topic with feature prefixes is present and we'll render two data source columns in the UI.
  hasFeatureColumn: boolean,
|};

export type TopicGroupType = {|
  ...SharedTopicGroupConfig,
  items: TopicItem[], // config item with derivedFields
  derivedFields: TopicGroupDerivedFields,
|};

export type TopicGroupsType = TopicGroupType[];

export type QuickAddTopicItem = {| topicName: string, displayName: string |};

export type TopicGroupsSearchResult = {| topic: Topic, namespaces: string[] |};
