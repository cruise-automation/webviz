// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { ITEM_TYPES } from "./constants";

export type ItemType = $Keys<typeof ITEM_TYPES>;
export const VALID_ITEM_TYPES: Set<ItemType> = new Set(Object.keys(ITEM_TYPES));

// ------- config related types -----------
type SettingsBySource = {
  overrideColor?: string,
  overrideCommand?: string,
};
type VisibilityBySource = { [topicPrefix: string]: boolean };
type HiddenNamespacesBySource = { [topicPrefix: string]: string[] };
type NodeConfigCommon = {|
  // add displayName later
  visibilityBySource?: VisibilityBySource,
|};
export type TfItemConfig = {|
  ...NodeConfigCommon,
  type: "TF",
  tfId: string,
|};
export type MapItemConfig = {|
  ...NodeConfigCommon,
  type: "MAP",
  mapId: string,
|};
export type TopicItemConfig = {|
  ...NodeConfigCommon,
  type: "TOPIC",
  topicName: string,
  settingsBySource?: SettingsBySource,
  hiddenNamespacesBySource?: HiddenNamespacesBySource,
  defaultAvailableNamespaces?: string[],
|};
export type TopicRowItemConfig = TfItemConfig | MapItemConfig | TopicItemConfig;
type TopicGroupConfigCommon = {|
  displayName: string,
  selected: boolean,
  expanded: boolean,
|};
export type TopicGroupConfig = {|
  ...TopicGroupConfigCommon,
  items: TopicRowItemConfig[],
|};

// ------- types derived from config -----------
type TopicRowItemCommon = {|
  visibilityBySource: VisibilityBySource,
  // derived fields
  displayName: string,
  id: string,
  disableMultiSelection: boolean,
|};
export type TfItem = {|
  ...TopicRowItemCommon,
  ...TfItemConfig,
|};
export type MapItem = {|
  ...TopicRowItemCommon,
  ...MapItemConfig,
|};
export type TopicItem = {|
  ...TopicRowItemCommon,
  ...TopicItemConfig,
|};

export type TopicRowItem = TfItem | MapItem | TopicItem;
export type TopicGroupType = {|
  ...TopicGroupConfigCommon,
  // derived fields
  id: string,
  items: TopicRowItem[],
|};

export type TopicGroupsType = TopicGroupType[];
