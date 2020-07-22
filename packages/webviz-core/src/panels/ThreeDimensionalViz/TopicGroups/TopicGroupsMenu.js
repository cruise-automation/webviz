// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import DotsVerticalIcon from "@mdi/svg/svg/dots-vertical.svg";
import React, { useState, useCallback } from "react";
import styled from "styled-components";

import { DEFAULT_IMPORTED_GROUP_NAME, KEYBOARD_SHORTCUTS } from "./constants";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import KeyboardShortcut from "webviz-core/src/components/KeyboardShortcut";
import Menu from "webviz-core/src/components/Menu";
import Item from "webviz-core/src/components/Menu/Item";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SIconWrapper = styled.div`
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
`;

const SLabel = styled.label`
  color: ${colors.TEXT_MUTED};
  display: inline-block;
  margin: 4px 0;
`;

const SKeyboardShortcutsWrapper = styled.div`
  padding: 8px 12px;
  border-top: 1px solid ${colors.DARK6};
  margin-top: 4px;
`;
type Props = {
  onImportSettings: () => void,
};

export default function TopicGroupsMenu({ onImportSettings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const onToggle = useCallback(() => setIsOpen((open) => !open), []);
  return (
    <ChildToggle position="below" onToggle={onToggle} isOpen={isOpen}>
      <SIconWrapper>
        <Icon medium fade active={isOpen}>
          <DotsVerticalIcon />
        </Icon>
      </SIconWrapper>
      <Menu>
        <Item
          tooltip={`Import your current topic tree selections as a new topic group "${DEFAULT_IMPORTED_GROUP_NAME}" and save it in the panel config.`}
          onClick={onImportSettings}>
          Import settings
        </Item>
        <Item
          tooltip={
            <div style={{ lineHeight: 1.5 }}>
              Topic tree will be removed in favor of topic groups. <br />
              Changes in topic groups will not be kept in sync with the topic tree.
              <br />
              Let us know if the topic groups work for you.
            </div>
          }
          onClick={() => {
            // saveConfig({ enableTopicTree: true });
            const { logger, eventNames, eventTags } = getGlobalHooks().getEventLogger() || {};
            if (logger && eventNames?.TOGGLE_TOPIC_GROUPS && eventTags?.ENABLE_TOPIC_GROUPS) {
              logger({ name: eventNames.TOGGLE_TOPIC_GROUPS, tags: { [eventTags.ENABLE_TOPIC_GROUPS]: false } });
            }
          }}>
          <span style={{ color: colors.RED }}>Enable topic tree</span>
        </Item>
        <SKeyboardShortcutsWrapper>
          <SLabel>KEYBOARD SHORTCUTS</SLabel>
          {KEYBOARD_SHORTCUTS.map(({ description, keys }, idx) => (
            <KeyboardShortcut key={idx} description={description} keys={keys} descriptionMaxWidth={188} />
          ))}
        </SKeyboardShortcutsWrapper>
      </Menu>
    </ChildToggle>
  );
}
