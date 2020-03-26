// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useContext, useCallback } from "react";
import styled from "styled-components";

import { ExpandIcon } from "./Accordion";
import DataSourceBadge from "./DataSourceBadge";
import DragHandle from "./DragHandle";
import KeyboardFocusIndex from "./KeyboardFocusIndex";
import TextHighlight from "./TextHighlight";
import TopicGroupMenu from "./TopicGroupMenu";
import { KeyboardContext } from "./TopicGroups";
import { toggleAllForGroupVisibility } from "./topicGroupsVisibilityUtils";
import { SIconWrapper } from "./TopicItemRowHeader";
import type { TopicGroupType, OnTopicGroupsChange } from "./types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const STopicGroupHeader = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  padding: 8px 4px;
  color: ${({ highlighted }) => (highlighted ? colors.LIGHT : "unset")};
  background-color: ${({ highlighted }) => (highlighted ? colors.HOVER_BACKGROUND_COLOR : "unset")};
`;

export const STopicGroupName = styled.div`
  padding-left: 8px;
  font-size: 13px;
  color: ${colors.LIGHT};
  flex: 1;
  cursor: pointer;
`;
const STopicsCount = styled.span`
  font-size: 12px;
  color: ${colors.TEXT_MUTED};
`;

type Props = {|
  hasBaseColumn: boolean,
  objectPath: string,
  onOpenGroupEditModal: ({ topicGroupIndex: number, currentFilterText?: string }) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  onToggleExpand: () => void,
  topicGroup: TopicGroupType,
  topicGroupIndex: number,
|};

export default function TopicGroupHeader({
  hasBaseColumn,
  objectPath,
  onOpenGroupEditModal,
  topicGroup,
  topicGroup: {
    displayName,
    expanded,
    items,
    visibilityByColumn = [false, false],
    derivedFields: { id, filterText, isKeyboardFocused, keyboardFocusIndex, prefixesByColumn, hasFeatureColumn },
  },
  topicGroupIndex,
  onTopicGroupsChange,
  onToggleExpand,
}: Props) {
  const { setFocusIndex } = useContext(KeyboardContext);

  const onShowGroupEditModal = useCallback(() => onOpenGroupEditModal({ topicGroupIndex }), [
    onOpenGroupEditModal,
    topicGroupIndex,
  ]);

  return (
    <STopicGroupHeader
      aria-selected={isKeyboardFocused}
      highlighted={!!isKeyboardFocused}
      className={`focus-item-${keyboardFocusIndex}`}
      onMouseEnter={() => {
        if (!isKeyboardFocused) {
          setFocusIndex(keyboardFocusIndex);
        }
      }}
      data-test={`topic-group-row-${displayName}`}
      role="option">
      <KeyboardFocusIndex highlighted={!!isKeyboardFocused} keyboardFocusIndex={keyboardFocusIndex} />
      <SIconWrapper>
        <DragHandle highlighted={!!isKeyboardFocused} />
      </SIconWrapper>
      {!filterText && (
        <SIconWrapper>
          <ExpandIcon dataTest={`test-toggle-expand-icon-${id}`} active={!!expanded} onToggle={onToggleExpand} />
        </SIconWrapper>
      )}
      <STopicGroupName data-test={`group-name-${displayName}`} onClick={onToggleExpand}>
        <TextHighlight targetStr={displayName} searchText={filterText} />
        <STopicsCount>
          {" "}
          ({items.length} {items.length === 1 ? "topic" : "topics"})
        </STopicsCount>
      </STopicGroupName>
      <span>
        {visibilityByColumn.map((colVisible, columnIndex) => {
          // Don't render the DataSourceBadge if topics are unavailable, and don't render
          // the feature column if featureColumn topics are unavailable.
          if (!hasBaseColumn || (!hasFeatureColumn && columnIndex > 0)) {
            return null;
          }
          return (
            <DataSourceBadge
              key={columnIndex}
              dataTest={`topic-group-${displayName}-${columnIndex}`}
              dataSourcePrefixes={prefixesByColumn[columnIndex]}
              available
              badgeText={`${columnIndex + 1}`}
              isParentVisible
              isTopicGroup
              highlighted={!!isKeyboardFocused}
              visible={colVisible}
              onToggleVisibility={() => {
                onTopicGroupsChange(`${objectPath}.visibilityByColumn[${columnIndex}]`, !colVisible);
              }}
              onToggleAllVisibilities={() => {
                onTopicGroupsChange(objectPath, toggleAllForGroupVisibility(topicGroup, columnIndex));
              }}
            />
          );
        })}
      </span>
      <TopicGroupMenu
        highlighted={!!isKeyboardFocused}
        objectPath={objectPath}
        onShowGroupEditModal={onShowGroupEditModal}
        onTopicGroupsChange={onTopicGroupsChange}
        topicGroup={topicGroup}
      />
    </STopicGroupHeader>
  );
}
