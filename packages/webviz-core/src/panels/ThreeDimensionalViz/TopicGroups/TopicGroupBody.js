// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";
import { SortableContainer, SortableElement } from "react-sortable-hoc";
import styled from "styled-components";

import QuickAddTopic from "./QuickAddTopic";
import TopicItemRow from "./TopicItemRow";
import type { TopicGroupType, OnTopicGroupsChange } from "./types";
import Button from "webviz-core/src/components/Button";
import { colors } from "webviz-core/src/util/colors";

const STopicGroupBody = styled.div`
  width: 100%;
  background: ${colors.DARK1};
`;

const SEmptyState = styled.div`
  height: 160px;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

type Props = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  topicGroup: TopicGroupType,
  topicGroupIndex: number,
  objectPath: string,
  onTopicGroupsChange: OnTopicGroupsChange,
  onOpenGroupEditModal: ({ topicGroupIndex: number, currentFilterText?: string }) => void,
  onOpenEditTopicSettingsModal: (objectPath: string) => void,
  dataTestShowErrors: boolean,
|};

const SortableItem = SortableElement(
  ({ item, objectPath, topicItemIndex, onOpenEditTopicSettingsModal, onTopicGroupsChange, dataTestShowErrors }) => (
    <TopicItemRow
      item={item}
      key={item.derivedFields.id}
      objectPath={`${objectPath}.items.[${topicItemIndex}]`}
      onOpenEditTopicSettingsModal={onOpenEditTopicSettingsModal}
      onTopicGroupsChange={onTopicGroupsChange}
      dataTestShowErrors={dataTestShowErrors}
    />
  )
);

const SortableList = SortableContainer(({ children }) => <ul>{children}</ul>);

export default function TopicGroupBody({
  availableTopicNames,
  displayNameByTopic,
  objectPath,
  topicGroup,
  topicGroup: { displayName, expanded, items },
  onOpenEditTopicSettingsModal,
  onTopicGroupsChange,
  onOpenGroupEditModal,
  topicGroupIndex,
  dataTestShowErrors,
}: Props) {
  const onShowGroupEditModal = useCallback(
    (currentFilterText?: string) => onOpenGroupEditModal({ topicGroupIndex, currentFilterText }),
    [onOpenGroupEditModal, topicGroupIndex]
  );

  const onSortEnd = ({ oldIndex, newIndex, ...rest }) => {
    // Move the dragged item from the oldIndex to the newIndex
    const movingItem = items[oldIndex];
    const newItems = [...items];
    newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, movingItem);
    onTopicGroupsChange(`${objectPath}.items`, newItems);
  };

  return (
    <STopicGroupBody>
      {!items.length && (
        <SEmptyState>
          Nothing here yet. Add topics to get started.
          <div style={{ padding: 16 }}>
            <Button isPrimary onClick={() => onShowGroupEditModal()}>
              Edit Group
            </Button>
          </div>
        </SEmptyState>
      )}
      {items.length > 0 && (
        <SortableList use onSortEnd={onSortEnd}>
          {items.map(
            (item, index) =>
              item.derivedFields.isShownInList && (
                <SortableItem
                  key={`item-${item.derivedFields.id}`}
                  topicItemIndex={index}
                  index={index}
                  item={item}
                  objectPath={objectPath}
                  onOpenEditTopicSettingsModal={onOpenEditTopicSettingsModal}
                  onTopicGroupsChange={onTopicGroupsChange}
                  dataTestShowErrors={dataTestShowErrors}
                />
              )
          )}
        </SortableList>
      )}
      {items.length > 0 && (
        <QuickAddTopic
          availableTopicNames={availableTopicNames}
          displayNameByTopic={displayNameByTopic}
          objectPath={`${objectPath}`}
          onShowGroupEditModal={onShowGroupEditModal}
          onTopicGroupsChange={onTopicGroupsChange}
          topicGroup={topicGroup}
        />
      )}
    </STopicGroupBody>
  );
}
