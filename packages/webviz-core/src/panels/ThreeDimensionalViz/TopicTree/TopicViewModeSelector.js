// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import Dropdown from "webviz-core/src/components/Dropdown";

import { type Save3DConfig } from "..";

export const TOPIC_DISPLAY_MODES = {
  SHOW_ALL: {
    value: "SHOW_ALL",
    label: "All",
  },
  SHOW_AVAILABLE: {
    value: "SHOW_AVAILABLE",
    label: "Available",
  },
  SHOW_SELECTED: {
    value: "SHOW_SELECTED",
    label: "Visible",
  },
};

const DEFAULT_DISPLAY_MODE = TOPIC_DISPLAY_MODES.SHOW_ALL.value;
const DEFAULT_BTN_WIDTH = 88; // Width for the longest selected option in dropdown.
const XS_WIDTH_BTN_WIDTH = 48;

const dropdownOptions = Object.keys(TOPIC_DISPLAY_MODES)
  .filter((item) => item !== "SHOW_TREE")
  .map((key) => ({
    label: TOPIC_DISPLAY_MODES[key].label,
    value: TOPIC_DISPLAY_MODES[key].value,
  }));

export type TopicDisplayMode = $Keys<typeof TOPIC_DISPLAY_MODES>;

const STopicViewModeSelector = styled.div`
  div {
    button {
      justify-content: space-between;
      line-height: 1.4;
    }
  }
`;
type Props = {|
  isXSWidth: boolean,
  topicDisplayMode: TopicDisplayMode,
  saveConfig: Save3DConfig,
|};

export default function TopicViewModeSelector({
  isXSWidth,
  topicDisplayMode: topicDisplayModeProp,
  saveConfig,
}: Props) {
  const topicDisplayMode = TOPIC_DISPLAY_MODES[topicDisplayModeProp] ? topicDisplayModeProp : DEFAULT_DISPLAY_MODE;
  return (
    <STopicViewModeSelector>
      <Dropdown
        btnStyle={{ width: isXSWidth ? XS_WIDTH_BTN_WIDTH : DEFAULT_BTN_WIDTH }}
        position="below"
        value={topicDisplayMode}
        text={TOPIC_DISPLAY_MODES[topicDisplayMode].label}
        onChange={(newValue) => saveConfig({ topicDisplayMode: newValue })}>
        {dropdownOptions.map(({ label, value }) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </Dropdown>
    </STopicViewModeSelector>
  );
}
