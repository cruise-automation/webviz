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
import { canEditDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";

type Props = {|
  item: TopicItem,
  objectPath: string,
  onEditTopicSettingsClick: (objectPath: string) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
|};

export default function TopicItemMenu({
  objectPath,
  item: {
    topicName,
    derivedFields: { displayName, availablePrefixes, datatype },
  },
  onTopicGroupsChange,
  onEditTopicSettingsClick,
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
        {availablePrefixes.length > 0 && datatype && canEditDatatype(datatype) && (
          <Item
            dataTest={`edit-topic-settings-menu-${displayName}`}
            onClick={() => onEditTopicSettingsClick(objectPath)}>
            Edit settings
          </Item>
        )}
        <Item
          dataTest={`delete-topic-menu-${displayName}`}
          onClick={() => {
            onTopicGroupsChange(objectPath, undefined);
            setIsOpen(false);
          }}>
          Remove topic
        </Item>
      </Menu>
    </ChildToggle>
  );
}
