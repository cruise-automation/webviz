// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LayersIcon from "@mdi/svg/svg/layers.svg";
import PinIcon from "@mdi/svg/svg/pin.svg";
import React, { useCallback } from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import Icon from "webviz-core/src/components/Icon";
import KeyboardShortcut from "webviz-core/src/components/KeyboardShortcut";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const STopIcons = styled.div`
  width: 56px;
  display: flex;
  height: 28px;
  position: relative;
`;
/* TODO(Audrey): stay consistent with other buttons in the 3D panel, will consolidate later. */
const SIconWrapper = styled.div`
  width: 28px;
  border-radius: 4px;
  padding: 0;
  padding: 4px;
  position: absolute;
  top: 0;
  left: 0;
`;

type Props = {|
  pinTopics: boolean,
  renderTopicGroups: boolean,
  saveConfig: Save3DConfig,
  setShowTopicGroups: (boolean | ((boolean) => boolean)) => void,
|};

export default function TopIcons({ pinTopics, renderTopicGroups, saveConfig, setShowTopicGroups }: Props) {
  const onClick = useCallback(() => setShowTopicGroups((shown) => !shown), [setShowTopicGroups]);
  return (
    <STopIcons>
      <SIconWrapper
        style={{
          backgroundColor: renderTopicGroups ? "transparent" : "#2d2c33",
          opacity: renderTopicGroups ? "0" : "1",
          transition: `all 0.1s ease-out`,
        }}>
        <Icon
          tooltipProps={{ placement: "top", contents: <KeyboardShortcut keys={["T"]} /> }}
          dataTest="open-topic-picker"
          active={renderTopicGroups}
          fade
          medium
          onClick={onClick}
          style={{ color: "white" }}>
          <LayersIcon />
        </Icon>
      </SIconWrapper>
      <SIconWrapper
        style={{
          transform: `translate(0px,${renderTopicGroups ? 0 : 28}px)`,
          opacity: renderTopicGroups ? "1" : "0",
          transition: `all 0.3s ease-in-out`,
          pointerEvents: renderTopicGroups ? "unset" : "none",
        }}>
        <Icon
          tooltipProps={{ placement: "top", contents: "Pin topic picker" }}
          small
          fade
          active={pinTopics}
          onClick={() => {
            // Keep TopicGroups open after unpin.
            setShowTopicGroups(true);
            saveConfig({ pinTopics: !pinTopics });
          }}
          style={{ color: pinTopics ? colors.HIGHLIGHT : colors.LIGHT }}>
          <PinIcon />
        </Icon>
      </SIconWrapper>
    </STopIcons>
  );
}
