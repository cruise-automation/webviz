// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LeadPencilIcon from "@mdi/svg/svg/lead-pencil.svg";
import xor from "lodash/xor";
import React from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import NodeName from "./NodeName";
import type { TreeNode } from "./types";
import VisibilityToggle, { TOGGLE_WRAPPER_SIZE } from "./VisibilityToggle";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";
import { canEditDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import type { Topic } from "webviz-core/src/players/types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const ICON_SIZE = 22;
const ROW_PADDING = 4;

export const STreeNodeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${ROW_PADDING}px 0;
`;

export const SLeft = styled.div`
  display: flex;
  align-items: center;
  margin-right: 4px;
`;

const SSettingChanged = styled.div`
  margin-left: 4px;
  width: 6px;
  height: 6px;
  background: ${colors.BLUE};
  border-radius: 3px;
`;

export const SRightActions = styled.div`
  display: flex;
  align-items: center;
  width: ${ICON_SIZE + TOGGLE_WRAPPER_SIZE * 2}px;
`;

export const SToggles = styled.div`
  display: flex;
  align-items: center;
`;

const SIconPlaceholder = styled.div`
  width: ${ICON_SIZE}px;
  height: 24px;
`;

type Props = {|
  checkedKeysSet: Set<string>,
  expandedKeys: string[],
  node: TreeNode,
  saveConfig: Save3DConfig,
  setCurrentEditingTopic: (?Topic) => void,
  settingsChanged: boolean,
  width: number,
|};

export default function TreeNodeRow({
  checkedKeysSet,
  expandedKeys,
  node,
  node: { name, key },
  saveConfig,
  setCurrentEditingTopic,
  settingsChanged,
  width,
}: Props) {
  const topicName = node.type === "topic" ? node.topicName : "";
  const datatype = node.type === "topic" && node.datatype;
  const nodeChecked = checkedKeysSet.has(key);

  // TODO(Audrey): handle override color
  return (
    <STreeNodeRow style={{ width }}>
      <SLeft>
        <NodeName
          onClick={() => {
            saveConfig({ expandedNodes: xor(expandedKeys, [key]) });
          }}
          style={{ marginLeft: 8 }}
          displayName={name || topicName}
          nodeKey={key}
          topicName={topicName}
          searchText={""}
        />
        {settingsChanged && (
          <Tooltip contents="Topic settings edited" placement="bottom">
            <SSettingChanged />
          </Tooltip>
        )}
      </SLeft>
      <SRightActions>
        <SToggles>
          <VisibilityToggle
            checked={nodeChecked}
            onToggle={() => {
              saveConfig({ checkedNodes: xor(Array.from(checkedKeysSet), [key]) });
            }}
            visible // TODO(Audrey): handle actual visibility.
          />
        </SToggles>
        {topicName && datatype && canEditDatatype(datatype) ? (
          <Icon
            style={{ padding: "0 4px" }}
            fade
            tooltip="Edit topic settings"
            onClick={() => {
              setCurrentEditingTopic({ name: topicName, datatype });
            }}>
            <LeadPencilIcon />
          </Icon>
        ) : (
          <SIconPlaceholder />
        )}
      </SRightActions>
    </STreeNodeRow>
  );
}
