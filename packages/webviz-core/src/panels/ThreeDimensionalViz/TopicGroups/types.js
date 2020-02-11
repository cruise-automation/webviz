// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MessageCollector from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/MessageCollector";

type SettingsBySource = {
  overrideColor?: string,
  overrideCommand?: string,
};

export type SceneCollectors = { [string]: MessageCollector };
export type OnTopicGroupsChange = (objectPath: string, newValue: any) => void;

export type VisibilityBySource = { [dataSourcePrefix: string]: boolean };
export type NamespacesBySource = { [dataSourcePrefix: string]: string[] };
export type OverrideColorBySource = { [dataSourcePrefix: string]: string };
export type GroupVisibilityBySource = {|
  visible: boolean,
  visibilityBySource: VisibilityBySource,
|};

export type DisplayVisibilityBySource = {
  [topicPrefix: string]: {
    isParentVisible: boolean,
    badgeText: string,
    visible: boolean,
    available: boolean,
  },
};
export type TopicItemConfig = {|
  displayName?: string,
  topicName: string,
  expanded?: boolean, // if true, namespaces will be expanded
  visibilityBySource?: VisibilityBySource,
  settingsBySource?: SettingsBySource,
  selectedNamespacesBySource?: NamespacesBySource,
|};

export type NamespaceItem = {|
  name: string,
  displayVisibilityBySource: DisplayVisibilityBySource,
|};

type DerivedTopicItemFields = {|
  id: string,
  availablePrefixes: string[],
  dataSourceBadgeSlots: number,
  datatype?: string,
  displayName: string,
  displayVisibilityBySource: DisplayVisibilityBySource,
  errors?: string[],
  filterText?: string,
  isBaseNamespaceAvailable: boolean,
  isBaseTopicAvailable: boolean,
  namespaceItems: NamespaceItem[],
  isShownInList: boolean,
  // TODO(Audrey): support 2nd bag for map and tf with `disableMultiSelection`
|};

export type TopicItem = {|
  ...TopicItemConfig,
  derivedFields: DerivedTopicItemFields,
|};

type SharedTopicGroupConfig = {|
  displayName: string,
  expanded?: boolean,
  visibilityBySource?: VisibilityBySource,
|};
export type TopicGroupConfig = {|
  ...SharedTopicGroupConfig,
  items: TopicItemConfig[],
|};

type TopicGroupDerivedFields = {|
  id: string,
  displayVisibilityBySourceByColumn: GroupVisibilityBySource[],
  filterText?: string,
  isShownInList: boolean,
|};

export type TopicGroupType = {|
  ...SharedTopicGroupConfig,
  items: TopicItem[], // config item with derivedFields
  derivedFields: TopicGroupDerivedFields,
|};

export type TopicGroupsType = TopicGroupType[];

export type QuickAddTopicItem = {| topicName: string, displayName: string |};
