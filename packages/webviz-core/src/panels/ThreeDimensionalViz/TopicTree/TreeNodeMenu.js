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

import { ROW_HEIGHT } from "./TreeNodeRow";
import type { SetCurrentEditingTopic } from "./types";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import KeyboardShortcut from "webviz-core/src/components/KeyboardShortcut";
import Menu, { Item } from "webviz-core/src/components/Menu";
import { TopicTreeContext } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/useTopicTree";
import clipboard from "webviz-core/src/util/clipboard";
import { useGuaranteedContext } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const DISABLED_STYLE = { cursor: "not-allowed", color: colors.TEXT_MUTED };

const SItemContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

type Props = {|
  datatype?: string,
  disableBaseColumn: boolean,
  disableFeatureColumn: boolean,
  hasFeatureColumn: boolean,
  nodeKey: string,
  providerAvailable: boolean,
  setCurrentEditingTopic: SetCurrentEditingTopic,
  topicName: string,
|};

export const DOT_MENU_WIDTH = 18; // The width of the small icon.

export default function TreeNodeMenu({
  datatype,
  disableBaseColumn,
  disableFeatureColumn,
  hasFeatureColumn,
  nodeKey,
  providerAvailable,
  setCurrentEditingTopic,
  topicName,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const { toggleCheckAllAncestors, toggleCheckAllDescendants } = useGuaranteedContext(
    TopicTreeContext,
    "TopicTreeContext"
  );
  const onToggle = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);

  // Don't render the dot menu if the datasources are unavailable and the node is group node (topic node has option to copy topicName).
  if (!providerAvailable && !topicName) {
    return null;
  }
  return (
    <ChildToggle position="below" isOpen={isOpen} onToggle={onToggle} dataTest={`topic-row-menu-${topicName}`}>
      <Icon
        small
        fade
        onClick={onToggle}
        style={{
          padding: "4px 0px",
          height: ROW_HEIGHT,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
        <DotsVerticalIcon />
      </Icon>
      <Menu>
        {providerAvailable && (
          <>
            <Item
              style={{ padding: "0 12px", ...(disableBaseColumn ? DISABLED_STYLE : undefined) }}
              onClick={() => {
                if (disableBaseColumn) {
                  return;
                }
                toggleCheckAllAncestors(nodeKey, 0);
                setIsOpen(false);
              }}>
              <SItemContent>
                <span style={{ paddingRight: 8 }}>Toggle ancestors</span>
                <KeyboardShortcut keys={["Alt", "Enter"]} />
              </SItemContent>
            </Item>
            <Item
              style={{ padding: "0 12px", ...(disableBaseColumn ? DISABLED_STYLE : undefined) }}
              onClick={() => {
                if (disableBaseColumn) {
                  return;
                }
                toggleCheckAllDescendants(nodeKey, 0);
                setIsOpen(false);
              }}>
              <SItemContent>
                <span style={{ paddingRight: 8 }}>Toggle descendants</span>
                <KeyboardShortcut keys={["Shift", "Enter"]} />
              </SItemContent>
            </Item>
            {hasFeatureColumn && (
              <>
                <Item
                  style={disableFeatureColumn ? DISABLED_STYLE : {}}
                  onClick={() => {
                    if (disableFeatureColumn) {
                      return;
                    }
                    toggleCheckAllAncestors(nodeKey, 1);
                    setIsOpen(false);
                  }}>
                  Toggle feature ancestors
                </Item>
                <Item
                  style={disableFeatureColumn ? DISABLED_STYLE : {}}
                  onClick={() => {
                    if (disableFeatureColumn) {
                      return;
                    }
                    toggleCheckAllDescendants(nodeKey, 1);
                    setIsOpen(false);
                  }}>
                  Toggle feature descendants
                </Item>
              </>
            )}
          </>
        )}
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
