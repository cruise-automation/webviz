// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

type SettingsBySource = {
  overrideColor?: string,
  overrideCommand?: string,
};

export type OnTopicGroupsChange = (objectPath: string, newValue: any) => void;

export type VisibilityBySource = { [dataSourcePrefix: string]: boolean };
export type NamespacesBySource = { [dataSourcePrefix: string]: string[] };

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
  visibilitiesBySource?: VisibilityBySource,
  settingsBySource?: SettingsBySource,
  selectedNamespacesBySource?: NamespacesBySource,
|};

export type NamespaceItem = {
  name: string,
  displayVisibilityBySource: DisplayVisibilityBySource,
};
type DerivedTopicItemFields = {|
  namespaceItems: NamespaceItem[],
  displayVisibilityBySource: DisplayVisibilityBySource,
  displayName: string,
  available: boolean,
  id: string,
  // TODO(Audrey): support 2nd bag for map and tf with `disableMultiSelection`
|};

export type TopicItem = {|
  ...TopicItemConfig,
  derivedFields: DerivedTopicItemFields,
|};

type SharedTopicGroupConfig = {|
  displayName: string,
  visible?: boolean,
  expanded?: boolean,
|};
export type TopicGroupConfig = {|
  ...SharedTopicGroupConfig,
  items: TopicItemConfig[],
|};
type TopicGroupDerivedFields = {|
  id: string,
|};

export type TopicGroupType = {|
  ...SharedTopicGroupConfig,
  items: TopicItem[], // config item with derivedFields
  derivedFields: TopicGroupDerivedFields,
|};

export type TopicGroupsType = TopicGroupType[];

export type QuickAddTopicItem = {| topicName: string, displayName: string |};
