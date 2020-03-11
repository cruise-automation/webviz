// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useContext } from "react";
import styled from "styled-components";

import CreateGroupButton from "./CreateGroupButton";
import { KeyboardContext } from "./TopicGroups";
import type { TopicGroupConfig } from "./types";
import EmptyBoxSvg from "webviz-core/src/assets/emptyBox.svg";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SEmptyState = styled.div`
  padding: 64px 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background-color: ${({ highlighted }) => (highlighted ? colors.HOVER_BACKGROUND_COLOR : "unset")};
`;

const SEmptyStateText = styled.div`
  font-size: 16px;
  margin: 16px 72px;
  text-align: center;
  line-height: 1.5;
  color: ${colors.LIGHT};
`;

type Props = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  onAddGroup: (newTopicGroupConfig: TopicGroupConfig) => void,
|};

export default function TopicGroupsEmptyState({ availableTopicNames, displayNameByTopic, onAddGroup }: Props) {
  const { focusIndex } = useContext(KeyboardContext);
  const emptyStateKeyboardFocusIndex = 0;
  return (
    <SEmptyState highlighted={focusIndex === emptyStateKeyboardFocusIndex}>
      <div style={{ width: 150, height: 64 }}>
        <EmptyBoxSvg />
      </div>
      <SEmptyStateText>Nothing here yet. Add topic groups to get started.</SEmptyStateText>
      <CreateGroupButton
        availableTopicNames={availableTopicNames}
        displayNameByTopic={displayNameByTopic}
        isEmptyStateCreate
        keyboardFocusIndex={emptyStateKeyboardFocusIndex}
        onAddGroup={onAddGroup}
      />
    </SEmptyState>
  );
}
