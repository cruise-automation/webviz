// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
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
import type { ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz/index";
import type { SaveConfig } from "webviz-core/src/types/panels";

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
          Pin Topics
        </Item>
        <Item
          onClick={() => saveConfig({ autoTextBackgroundColor: !autoTextBackgroundColor })}
          icon={autoTextBackgroundColor ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}>
          Auto Text Background
        </Item>
      </Menu>
    </ChildToggle>
  );
}
