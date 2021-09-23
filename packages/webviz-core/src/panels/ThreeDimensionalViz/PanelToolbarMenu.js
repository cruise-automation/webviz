// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowLeftIcon from "@mdi/svg/svg/arrow-left.svg";
import ArrowRightIcon from "@mdi/svg/svg/arrow-right.svg";
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import SwapHorizontalIcon from "@mdi/svg/svg/swap-horizontal.svg";
import SyncIcon from "@mdi/svg/svg/sync.svg";
import React, { memo } from "react";

import { Item, SubMenu } from "webviz-core/src/components/Menu";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { type Save3DConfig } from "webviz-core/src/panels/ThreeDimensionalViz";
import helpContent from "webviz-core/src/panels/ThreeDimensionalViz/index.help.md";
import type { TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";

export const SYNC_OPTIONS = {
  bag1ToBag2: "bag1ToBag2",
  bag2ToBag1: "bag2ToBag1",
  swapBag1AndBag2: "swapBag1AndBag2",
};

type Props = {
  saveConfig: Save3DConfig,
  flattenMarkers: boolean,
  autoTextBackgroundColor: boolean,
  checkedKeys: string[],
  settingsByKey: TopicSettingsCollection,
};

type BagSyncData = {| checkedKeys: string[], settingsByKey: TopicSettingsCollection |};
type SyncOption = $Keys<typeof SYNC_OPTIONS>;
type Keys = {| bag1: string[], bag2: [] |};

function bag2KeyToBag1Key(bag2Key: string) {
  if (bag2Key.startsWith(`t:${$WEBVIZ_SOURCE_2}`)) {
    return bag2Key.replace(`t:${$WEBVIZ_SOURCE_2}`, "t:");
  }
  if (bag2Key.startsWith("name_2:")) {
    return bag2Key.replace("name_2:", "name:");
  }
  return bag2Key.replace(`ns:${$WEBVIZ_SOURCE_2}`, "ns:");
}
function bag1KeyToBag2Key(bag1Key: string) {
  if (bag1Key.startsWith("t:")) {
    return bag1Key.replace("t:", `t:${$WEBVIZ_SOURCE_2}`);
  }
  if (bag1Key.startsWith("name:")) {
    return bag1Key.replace("name:", "name_2:");
  }
  return bag1Key.replace("ns:", `ns:${$WEBVIZ_SOURCE_2}`);
}

function partitionKeys(
  keys: string[]
): {|
  groupKeys: Keys,
  topicKeys: Keys,
  namespaceKeys: Keys,
|} {
  const result = {
    groupKeys: { bag1: [], bag2: [] },
    topicKeys: { bag1: [], bag2: [] },
    namespaceKeys: { bag1: [], bag2: [] },
  };
  keys.forEach((key) => {
    if (key.startsWith(`t:${$WEBVIZ_SOURCE_2}`)) {
      result.topicKeys.bag2.push(key);
    } else if (key.startsWith("t:")) {
      result.topicKeys.bag1.push(key);
    } else if (key.startsWith("name_2:")) {
      result.groupKeys.bag2.push(key);
    } else if (key.startsWith("name:")) {
      result.groupKeys.bag1.push(key);
    } else if (key.startsWith(`ns:${$WEBVIZ_SOURCE_2}`)) {
      result.namespaceKeys.bag2.push(key);
    } else if (key.startsWith("ns:")) {
      result.namespaceKeys.bag1.push(key);
    }
  });
  return result;
}

export function syncBags({ checkedKeys, settingsByKey }: BagSyncData, syncOption: SyncOption): BagSyncData {
  const { groupKeys, topicKeys, namespaceKeys } = partitionKeys(checkedKeys);
  const bag1CheckedKeys = [...groupKeys.bag1, ...topicKeys.bag1, ...namespaceKeys.bag1];
  const bag2CheckedKeys = [...groupKeys.bag2, ...topicKeys.bag2, ...namespaceKeys.bag2];
  const settingKeys = Object.keys(settingsByKey);
  const { topicKeys: topicKeys1, namespaceKeys: namespaceKeys1 } = partitionKeys(settingKeys);
  const bag1SettingKeys = [...topicKeys1.bag1, ...namespaceKeys1.bag1];
  const bag2SettingKeys = [...topicKeys1.bag2, ...namespaceKeys1.bag2];

  const result = { checkedKeys: { bag1: [], bag2: [] }, settingsByKey: {} };
  const newSettingsByKey = {};

  switch (syncOption) {
    case "bag1ToBag2":
      result.checkedKeys = { bag1: bag1CheckedKeys, bag2: bag1CheckedKeys.map(bag1KeyToBag2Key) };
      bag1SettingKeys.forEach((bag1Key) => (newSettingsByKey[bag1Key] = settingsByKey[bag1Key]));
      bag1SettingKeys.forEach((bag1Key) => (newSettingsByKey[bag1KeyToBag2Key(bag1Key)] = settingsByKey[bag1Key]));
      break;
    case "bag2ToBag1":
      result.checkedKeys = { bag1: bag2CheckedKeys.map(bag2KeyToBag1Key), bag2: bag2CheckedKeys };
      bag2SettingKeys.forEach((bag2Key) => (newSettingsByKey[bag2Key] = settingsByKey[bag2Key]));
      bag2SettingKeys.forEach((bag2Key) => (newSettingsByKey[bag2KeyToBag1Key(bag2Key)] = settingsByKey[bag2Key]));
      break;
    case "swapBag1AndBag2":
      result.checkedKeys = { bag1: bag2CheckedKeys.map(bag2KeyToBag1Key), bag2: bag1CheckedKeys.map(bag1KeyToBag2Key) };
      bag2SettingKeys.forEach((bag2Key) => (newSettingsByKey[bag2KeyToBag1Key(bag2Key)] = settingsByKey[bag2Key]));
      bag1SettingKeys.forEach((bag1Key) => (newSettingsByKey[bag1KeyToBag2Key(bag1Key)] = settingsByKey[bag1Key]));
      break;
    default:
      (syncOption: empty);
      throw new Error(`Unsupported sync option ${syncOption}`);
  }

  return { checkedKeys: [...result.checkedKeys.bag1, ...result.checkedKeys.bag2], settingsByKey: newSettingsByKey };
}

export default memo<Props>(function PanelToolbarMenu({
  checkedKeys,
  settingsByKey,
  saveConfig,
  flattenMarkers,
  autoTextBackgroundColor,
}: Props) {
  return (
    <PanelToolbar
      floating
      helpContent={helpContent}
      menuContent={
        <>
          <Item
            tooltip="Marker poses / points with a z-value of 0 are updated to have the flattened base frame's z-value."
            icon={flattenMarkers ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
            onClick={() => saveConfig({ flattenMarkers: !flattenMarkers })}>
            Flatten markers
          </Item>
          <Item
            tooltip="Automatically apply dark/light background color to text."
            icon={autoTextBackgroundColor ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
            onClick={() => saveConfig({ autoTextBackgroundColor: !autoTextBackgroundColor })}>
            Auto text background
          </Item>
          <SubMenu checked={false} text="Sync settings" icon={<SyncIcon />}>
            <Item
              icon={<ArrowRightIcon />}
              tooltip="Set bag 2's topic settings and selected topics to bag 1's"
              onClick={() => saveConfig(syncBags({ checkedKeys, settingsByKey }, SYNC_OPTIONS.bag1ToBag2))}>
              Sync bag 1 to bag 2
            </Item>
            <Item
              icon={<ArrowLeftIcon />}
              tooltip="Set bag 1's topic settings and selected topics to bag 2's"
              onClick={() => saveConfig(syncBags({ checkedKeys, settingsByKey }, SYNC_OPTIONS.bag2ToBag1))}>
              Sync bag 2 to bag 1
            </Item>
            <Item
              icon={<SwapHorizontalIcon />}
              tooltip="Swap topic settings and selected topics between bag 1 and bag 2"
              onClick={() => saveConfig(syncBags({ checkedKeys, settingsByKey }, SYNC_OPTIONS.swapBag1AndBag2))}>
              Swap bags 1 and 2
            </Item>
          </SubMenu>
        </>
      }
    />
  );
});
