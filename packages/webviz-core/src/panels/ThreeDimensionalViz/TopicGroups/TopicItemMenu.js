// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import DotsVerticalIcon from "@mdi/svg/svg/dots-vertical.svg";
import React, { useCallback, useState } from "react";

import { SMenuWrapper } from "./TopicGroupMenu";
import type { TopicItem, OnTopicGroupsChange } from "./types";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu, { Item } from "webviz-core/src/components/Menu";

type Props = {|
  item: TopicItem,
  objectPath: string,
  onTopicGroupsChange: OnTopicGroupsChange,
|};

export default function TopicItemMenu({
  objectPath,
  item: {
    derivedFields: { displayName },
  },
  onTopicGroupsChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const onToggle = useCallback((ev) => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  }, []);

  return (
    <ChildToggle position="below" isOpen={isOpen} onToggle={onToggle} dataTest={`open-topic-menu-${displayName}`}>
      <SMenuWrapper>
        <Icon onClick={onToggle} style={{ width: 32, height: 32, padding: 8 }} medium>
          <DotsVerticalIcon />
        </Icon>
      </SMenuWrapper>
      <Menu>
        <Item
          dataTest={`delete-topic-menu-${displayName}`}
          onClick={() => {
            onTopicGroupsChange(objectPath, null);
            setIsOpen(false);
          }}>
          Remove topic
        </Item>
      </Menu>
    </ChildToggle>
  );
}
