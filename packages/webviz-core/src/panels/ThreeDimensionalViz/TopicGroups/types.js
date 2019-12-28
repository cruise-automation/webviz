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

export type TopicGroupConfig = {|
  displayName: string,
  items: TopicItemConfig[],
  visible?: boolean,
  expanded?: boolean,
|};
type TopicGroupDerivedFields = {|
  id: string,
  items: TopicItem[],
|};

export type TopicGroupType = {|
  ...TopicGroupConfig,
  derivedFields: TopicGroupDerivedFields,
|};

export type TopicGroupsType = TopicGroupType[];
