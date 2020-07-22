// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import DotsVerticalIcon from "@mdi/svg/svg/dots-vertical.svg";
import React, { useCallback, useState } from "react";
import styled from "styled-components";

import type { TopicGroupType, OnTopicGroupsChange } from "./types";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu, { Item } from "webviz-core/src/components/Menu";

export const SMenuWrapper = styled.span`
  color: ${({ highlighted }) => (highlighted ? 1 : "unset")};
  opacity: ${({ highlighted }) => (highlighted ? 1 : 0.1)};
`;

type Props = {|
  highlighted: boolean,
  objectPath: string,
  onShowGroupEditModal: () => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  topicGroup: TopicGroupType,
|};

export default function TopicGroupMenu({
  highlighted,
  objectPath,
  onShowGroupEditModal,
  topicGroup: { displayName },
  onTopicGroupsChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const onToggle = useCallback(() => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  }, []);

  return (
    <ChildToggle position="below" isOpen={isOpen} onToggle={onToggle} dataTest={`open-topic-group-menu-${displayName}`}>
      <SMenuWrapper highlighted={highlighted}>
        <Icon onClick={onToggle} style={{ padding: "8px 0px 8px 4px" }} medium>
          <DotsVerticalIcon />
        </Icon>
      </SMenuWrapper>
      <Menu>
        <Item
          dataTest={`edit-topic-group-menu-${displayName}`}
          onClick={() => {
            onShowGroupEditModal();
            setIsOpen(false);
          }}>
          Edit group
        </Item>
        <Item
          dataTest={`delete-topic-group-menu-${displayName}`}
          onClick={() => {
            onTopicGroupsChange(objectPath, undefined);
            setIsOpen(false);
          }}>
          Remove group
        </Item>
      </Menu>
    </ChildToggle>
  );
}
