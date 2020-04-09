// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LayersIcon from "@mdi/svg/svg/layers.svg";
import PinIcon from "@mdi/svg/svg/pin.svg";
import React from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import Icon from "webviz-core/src/components/Icon";
import KeyboardShortcut from "webviz-core/src/components/KeyboardShortcut";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const SWITCHER_HEIGHT = 28;
const STopicTreeSwitcher = styled.div`
  width: 56px;
  display: flex;
  height: ${SWITCHER_HEIGHT}px;
  position: relative;
`;
/* TODO(Audrey): stay consistent with other buttons in the 3D panel, will consolidate later. */
const SIconWrapper = styled.div`
  width: 28px;
  border-radius: 4px;
  padding: 4px;
  position: absolute;
  top: 0;
  left: 0;
`;

type Props = {|
  pinTopics: boolean,
  renderTopicTree: boolean,
  saveConfig: Save3DConfig,
  setShowTopicTree: (boolean) => void,
  showTopicTree: boolean,
|};

export default function TopicTreeSwitcher({
  pinTopics,
  renderTopicTree,
  saveConfig,
  setShowTopicTree,
  showTopicTree,
}: Props) {
  return (
    <STopicTreeSwitcher>
      <SIconWrapper
        style={{
          backgroundColor: renderTopicTree ? "transparent" : "#2d2c33",
          opacity: renderTopicTree ? "0" : "1",
          transition: `all 0.1s ease-out`,
        }}>
        <Icon
          tooltipProps={{ placement: "top", contents: <KeyboardShortcut keys={["T"]} /> }}
          dataTest="open-topic-picker"
          active={renderTopicTree}
          fade
          medium
          onClick={() => setShowTopicTree(!showTopicTree)}>
          <LayersIcon />
        </Icon>
      </SIconWrapper>
      <SIconWrapper
        style={{
          transform: `translate(0px,${renderTopicTree ? 0 : 28}px)`,
          opacity: renderTopicTree ? "1" : "0",
          transition: `all 0.3s ease-in-out`,
          pointerEvents: renderTopicTree ? "unset" : "none",
        }}>
        <Icon
          tooltipProps={{ placement: "top", contents: "Pin topic picker" }}
          small
          fade
          active={pinTopics}
          onClick={() => {
            // Keep TopicTree open after unpin.
            setShowTopicTree(true);
            saveConfig({ pinTopics: !pinTopics });
          }}
          style={{ color: pinTopics ? colors.HIGHLIGHT : colors.LIGHT }}>
          <PinIcon />
        </Icon>
      </SIconWrapper>
    </STopicTreeSwitcher>
  );
}
