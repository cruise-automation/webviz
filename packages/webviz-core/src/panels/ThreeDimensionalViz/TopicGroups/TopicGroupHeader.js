// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { assign } from "lodash";
import React, { useState, useCallback } from "react";
import styled from "styled-components";

import { ExpandIcon } from "./Accordion";
import DataSourceBadge from "./DataSourceBadge";
import DragHandle, { SDragHandle } from "./DragHandle";
import TextHighlight from "./TextHighlight";
import TopicGroupMenu, { SMenuWrapper } from "./TopicGroupMenu";
import { DEFAULT_GROUP_VISIBILITY_BY_SOURCE } from "./topicGroupsUtils";
import { SIconWrapper } from "./TopicItemRowHeader";
import type { TopicGroupType, OnTopicGroupsChange } from "./types";
import { colors } from "webviz-core/src/util/colors";

const STopicGroupHeader = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  padding: 8px 4px;
  transition: 0.3s;
  &:hover {
    color: ${colors.LIGHT};
    background-color: ${colors.HOVER_BACKGROUND_COLOR};
    ${SMenuWrapper} {
      color: white;
      opacity: 1;
    }
    ${SDragHandle} {
      color: white;
      opacity: 1;
    }
  }
`;

export const STopicGroupName = styled.div`
  padding-left: 8px;
  font-size: 13px;
  color: ${colors.LIGHT};
  flex: 1;
`;

type Props = {|
  objectPath: string,
  onOpenGroupEditModal: ({ topicGroupIndex: number, currentFilterText?: string }) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  onToggleExpand: () => void,
  topicGroup: TopicGroupType,
  topicGroupIndex: number,
|};

export default function TopicGroupHeader({
  objectPath,
  onOpenGroupEditModal,
  topicGroup,
  topicGroup: {
    displayName,
    expanded,
    visibilityBySource,
    derivedFields: { id, displayVisibilityBySourceByColumn, filterText },
  },
  topicGroupIndex,
  onTopicGroupsChange,
  onToggleExpand,
}: Props) {
  const [isHovering, setIsHovering] = useState(false);
  const onShowGroupEditModal = useCallback(() => onOpenGroupEditModal({ topicGroupIndex }), [
    onOpenGroupEditModal,
    topicGroupIndex,
  ]);
  return (
    <STopicGroupHeader onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <SIconWrapper>
        <DragHandle />
      </SIconWrapper>
      <SIconWrapper>
        <ExpandIcon dataTest={`test-toggle-expand-icon-${id}`} active={!!expanded} onToggle={onToggleExpand} />
      </SIconWrapper>
      <STopicGroupName>
        <TextHighlight targetStr={displayName} searchText={filterText} />
      </STopicGroupName>
      <span>
        {displayVisibilityBySourceByColumn.map((item, idx) => (
          <DataSourceBadge
            key={idx}
            dataTest={`topic-group-${displayName}`}
            available
            badgeText={`${idx + 1}`}
            isParentVisible
            isHovering={isHovering}
            visible={item.visible}
            onToggleVisibility={() => {
              // Flip all the visibilities in this prefix group and merge with the overall visibilityBySource
              const newVisibilityBySource = assign(
                {},
                DEFAULT_GROUP_VISIBILITY_BY_SOURCE,
                visibilityBySource,
                ...Object.keys(item.visibilityBySource).map((prefix) => ({ [prefix]: !item.visible }))
              );
              onTopicGroupsChange(`${objectPath}.visibilityBySource`, newVisibilityBySource);
            }}
          />
        ))}
      </span>
      <TopicGroupMenu
        objectPath={objectPath}
        onShowGroupEditModal={onShowGroupEditModal}
        onTopicGroupsChange={onTopicGroupsChange}
        topicGroup={topicGroup}
      />
    </STopicGroupHeader>
  );
}
