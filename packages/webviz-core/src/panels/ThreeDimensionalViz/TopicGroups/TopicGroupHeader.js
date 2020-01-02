// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import EyeOffOutlineIcon from "@mdi/svg/svg/eye-off-outline.svg";
import EyeOutlineIcon from "@mdi/svg/svg/eye-outline.svg";
import React from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

import TopicGroupMenu from "./TopicGroupMenu";
import type { TopicGroupType, OnTopicGroupsChange } from "./types";
import Icon from "webviz-core/src/components/Icon";
import { colors } from "webviz-core/src/util/colors";

const STopicGroupHeader = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  margin: 8px 0;
`;

export const STopicGroupName = styled.div`
  font-size: 16px;
  color: ${(props) =>
    props.visible
      ? colors.YELLOW1
      : tinyColor(colors.YELLOW1)
          .setAlpha(0.2)
          .toRgbString()};
  flex: 1;
`;

export const SEyeIcon = styled.span`
  opacity: ${(props) => (props.visible ? 0 : 0.4)};
`;

type Props = {|
  objectPath: string,
  onTopicGroupsChange: OnTopicGroupsChange,
  topicGroup: TopicGroupType,
|};

export default function TopicGroupHeader({
  objectPath,
  topicGroup,
  topicGroup: { displayName, expanded, visible },
  onTopicGroupsChange,
}: Props) {
  return (
    <STopicGroupHeader>
      <STopicGroupName visible={visible}>{displayName}</STopicGroupName>
      <SEyeIcon visible={visible}>
        <Icon
          style={{ width: 32, height: 32, padding: 8 }}
          dataTest={`topic-group-${displayName}`}
          onClick={() => onTopicGroupsChange(`${objectPath}.visible`, !visible)}
          medium>
          {visible ? <EyeOutlineIcon /> : <EyeOffOutlineIcon />}
        </Icon>
      </SEyeIcon>
      <TopicGroupMenu objectPath={objectPath} onTopicGroupsChange={onTopicGroupsChange} topicGroup={topicGroup} />
    </STopicGroupHeader>
  );
}
