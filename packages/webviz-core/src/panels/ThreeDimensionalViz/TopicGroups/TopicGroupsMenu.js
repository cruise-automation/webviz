// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import DotsVerticalIcon from "@mdi/svg/svg/dots-vertical.svg";
import React, { useState } from "react";
import styled from "styled-components";

import { DEFAULT_IMPORTED_GROUP_NAME } from "./constants";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu from "webviz-core/src/components/Menu";
import Item from "webviz-core/src/components/Menu/Item";
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
  onImportSettings: () => void,
};

export default function TopicGroupsMenu({ saveConfig, onImportSettings }: Props) {
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
          tooltip={`Import your current topic tree selections as a new topic group "${DEFAULT_IMPORTED_GROUP_NAME}" and save it in the panel config.`}
          onClick={() => onImportSettings()}>
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
          onClick={() => saveConfig({ enableTopicTree: true })}>
          <span style={{ color: colors.RED }}>Enable topic tree</span>
        </Item>
      </Menu>
    </ChildToggle>
  );
}
