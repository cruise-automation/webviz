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

import type { SetCurrentEditingTopic, ToggleNode } from "./types";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import KeyboardShortcut from "webviz-core/src/components/KeyboardShortcut";
import Menu, { Item } from "webviz-core/src/components/Menu";
import clipboard from "webviz-core/src/util/clipboard";

const SItemContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

type Props = {|
  datatype?: string,
  nodeKey: string,
  setCurrentEditingTopic: SetCurrentEditingTopic,
  toggleCheckAllAncestors: ToggleNode,
  toggleCheckAllDescendants: ToggleNode,
  topicName: string,
|};

export const DOT_MENU_WIDTH = 18; // The width of the small icon.

export default function TreeNodeDotMenu({
  datatype,
  nodeKey,
  setCurrentEditingTopic,
  toggleCheckAllAncestors,
  toggleCheckAllDescendants,
  topicName,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const onToggle = useCallback((ev) => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  }, []);

  return (
    <ChildToggle position="below" isOpen={isOpen} onToggle={onToggle} dataTest={`topic-row-menu-${topicName}`}>
      <Icon small fade onClick={onToggle} style={{ padding: "4px 0px" }}>
        <DotsVerticalIcon />
      </Icon>
      <Menu>
        <Item
          style={{ padding: "0 12px" }}
          onClick={() => {
            toggleCheckAllAncestors(nodeKey);
            setIsOpen(false);
          }}>
          <SItemContent>
            <span style={{ paddingRight: 8 }}>Toggle ancestors</span>
            <KeyboardShortcut keys={["Alt", "Enter"]} />
          </SItemContent>
        </Item>
        <Item
          style={{ padding: "0 12px" }}
          onClick={() => {
            toggleCheckAllDescendants(nodeKey);
            setIsOpen(false);
          }}>
          <SItemContent>
            <span style={{ paddingRight: 8 }}>Toggle descendants</span>
            <KeyboardShortcut keys={["Shift", "Enter"]} />
          </SItemContent>
        </Item>
        {topicName && (
          <Item
            onClick={() => {
              clipboard.copy(topicName);
              setIsOpen(false);
            }}>
            Copy topic name
          </Item>
        )}
        {datatype && (
          <Item
            dataTest={`topic-row-menu-edit-settings-${topicName}`}
            onClick={() => {
              setCurrentEditingTopic({ name: topicName, datatype });
              setIsOpen(false);
            }}>
            Edit topic settings
          </Item>
        )}
      </Menu>
    </ChildToggle>
  );
}
