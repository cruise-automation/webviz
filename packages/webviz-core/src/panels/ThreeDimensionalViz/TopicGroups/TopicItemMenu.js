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
  highlighted: boolean,
  item: TopicItem,
  objectPath: string,
  onOpenEditTopicSettingsModal: (objectPath: string) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
|};

export default function TopicItemMenu({
  highlighted,
  objectPath,
  item: {
    derivedFields: { displayName, datatype },
  },
  onTopicGroupsChange,
  onOpenEditTopicSettingsModal,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const onToggle = useCallback(() => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  }, []);

  return (
    <ChildToggle position="below" isOpen={isOpen} onToggle={onToggle} dataTest={`open-topic-menu-${displayName}`}>
      <SMenuWrapper highlighted={highlighted}>
        <Icon onClick={onToggle} style={{ width: 28, height: 32, padding: `8px 0px 8px 4px` }} medium>
          <DotsVerticalIcon />
        </Icon>
      </SMenuWrapper>
      <Menu>
        {datatype && canEditDatatype(datatype) && (
          <Item
            dataTest={`edit-topic-settings-menu-${displayName}`}
            onClick={() => {
              onOpenEditTopicSettingsModal(objectPath);
              setIsOpen(false);
            }}>
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
