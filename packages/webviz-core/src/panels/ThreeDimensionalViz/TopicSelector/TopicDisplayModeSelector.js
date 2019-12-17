// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import FileTreeIcon from "@mdi/svg/svg/file-tree.svg";
import React, { useState } from "react";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import Item from "webviz-core/src/components/Menu/Item";

import type { Save3DConfig } from "..";

export const TOPIC_DISPLAY_MODES = {
  SHOW_TREE: {
    value: "SHOW_TREE",
    label: "Tree (default)",
    filterInputPlaceholder: "Type to filter",
  },
  SHOW_SELECTED: {
    value: "SHOW_SELECTED",
    label: "Flat (checked topics)",
    filterInputPlaceholder: "Filter visible topics",
  },
  SHOW_AVAILABLE: {
    value: "SHOW_AVAILABLE",
    label: "Flat (available topics)",
    filterInputPlaceholder: "Filter available topics",
  },
  SHOW_ALL: {
    value: "SHOW_ALL",
    label: "Flat (all topics)",
    filterInputPlaceholder: "Filter all topics",
  },
};

export type TopicDisplayMode = $Keys<typeof TOPIC_DISPLAY_MODES>;

type Props = {
  menuTooltip: string,
  saveConfig: Save3DConfig,
  topicDisplayMode: TopicDisplayMode,
};
export default function TopicDisplayModeSelector({ menuTooltip, saveConfig, topicDisplayMode }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ChildToggle position="below" onToggle={() => setIsOpen(!isOpen)} isOpen={isOpen}>
      <Icon small fade active={isOpen} tooltip={menuTooltip}>
        <FileTreeIcon />
      </Icon>
      <Menu>
        {/* $FlowFixMe */}
        {Object.values(TOPIC_DISPLAY_MODES).map(({ value, label }) => (
          <Item
            checked={value === topicDisplayMode}
            value={value}
            key={value}
            onClick={() => saveConfig({ topicDisplayMode: value })}>
            {label}
          </Item>
        ))}
      </Menu>
    </ChildToggle>
  );
}
