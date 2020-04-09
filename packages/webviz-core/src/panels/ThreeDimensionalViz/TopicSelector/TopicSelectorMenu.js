// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import DotsVerticalIcon from "@mdi/svg/svg/dots-vertical.svg";
import React, { useState } from "react";
import styled from "styled-components";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import Item from "webviz-core/src/components/Menu/Item";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz/index";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SIconWrapper = styled.div`
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
`;

type Props = {
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  pinTopics: boolean,
  autoTextBackgroundColor: boolean,
};

export default function TopicSelectorMenu({ saveConfig, pinTopics, autoTextBackgroundColor }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ChildToggle position="below" onToggle={() => setIsOpen(!isOpen)} isOpen={isOpen}>
      <SIconWrapper>
        <Icon medium fade active={isOpen}>
          <DotsVerticalIcon />
        </Icon>
      </SIconWrapper>
      <Menu>
        <Item
          onClick={() => saveConfig({ pinTopics: !pinTopics })}
          icon={pinTopics ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}>
          Pin topics
        </Item>
        <Item
          onClick={() => saveConfig({ autoTextBackgroundColor: !autoTextBackgroundColor })}
          icon={autoTextBackgroundColor ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}>
          Auto text background
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
            saveConfig({ enableTopicTree: false });
            const { logger, eventNames, eventTags } = getGlobalHooks().getEventLogger() || {};
            if (logger && eventNames?.TOGGLE_TOPIC_GROUPS && eventTags?.ENABLE_TOPIC_GROUPS) {
              logger({ name: eventNames.TOGGLE_TOPIC_GROUPS, tags: { [eventTags.ENABLE_TOPIC_GROUPS]: true } });
            }
          }}
          icon={<CheckboxBlankOutlineIcon />}>
          <span style={{ color: colors.GREEN }}>Enable topic groups</span>
        </Item>
      </Menu>
    </ChildToggle>
  );
}
