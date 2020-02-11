// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useMemo, useState } from "react";
import { SortableContainer, SortableElement } from "react-sortable-hoc";
import styled from "styled-components";

import Accordion from "./Accordion";
import CreateGroupButton from "./CreateGroupButton";
import TopicGroupBody from "./TopicGroupBody";
import TopicGroupEdit from "./TopicGroupEdit";
import TopicGroupHeader from "./TopicGroupHeader";
import TopicSettingsEditor from "./TopicSettingsEditor";
import type { TopicGroupType, OnTopicGroupsChange, TopicGroupConfig, SceneCollectors } from "./types";
import Modal from "webviz-core/src/components/Modal";
import { RenderToBodyComponent } from "webviz-core/src/components/renderToBody";

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
  dataTestShowErrors: boolean,
  displayNameByTopic: { [topicName: string]: string },
  onAddGroup: (newTopicGroupConfig: TopicGroupConfig) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  topicGroups: TopicGroupType[],
  sceneCollectors: SceneCollectors,
|};

type SortableItemProps = {|
  availableTopicNames: string[],
  dataTestShowErrors: boolean,
  displayNameByTopic: { [topicName: string]: string },
  topicGroupIndex: number,
  objectPath: string,
  onOpenEditTopicSettingsModal: (objectPath: string) => void,
  onOpenGroupEditModal: ({ topicGroupIndex: number, currentFilterText?: string }) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  topicGroup: TopicGroupType,
|};
const SortableItem = SortableElement(
  ({
    availableTopicNames,
    dataTestShowErrors,
    displayNameByTopic,
    topicGroupIndex,
    objectPath,
    onOpenEditTopicSettingsModal,
    onOpenGroupEditModal,
    onTopicGroupsChange,
    topicGroup,
  }: SortableItemProps) => {
    return (
      <li style={{ listStyle: "none" }}>
        <Accordion
          defaultActive={topicGroup.expanded}
          renderHeader={({ onToggle }) => (
            <TopicGroupHeader
              onTopicGroupsChange={onTopicGroupsChange}
              topicGroup={topicGroup}
              objectPath={objectPath}
              onOpenGroupEditModal={onOpenGroupEditModal}
              onToggleExpand={() => {
                onToggle();
                onTopicGroupsChange(`${objectPath}.expanded`, !topicGroup.expanded);
              }}
              topicGroupIndex={topicGroupIndex}
            />
          )}>
          <TopicGroupBody
            availableTopicNames={availableTopicNames}
            dataTestShowErrors={dataTestShowErrors}
            displayNameByTopic={displayNameByTopic}
            topicGroupIndex={topicGroupIndex}
            objectPath={objectPath}
            onOpenEditTopicSettingsModal={onOpenEditTopicSettingsModal}
            onTopicGroupsChange={onTopicGroupsChange}
            onOpenGroupEditModal={onOpenGroupEditModal}
            topicGroup={topicGroup}
          />
        </Accordion>
      </li>
    );
  }
);

const SortableList = SortableContainer(({ children }) => <ul>{children}</ul>);

type TopicGroupEditingState = { topicGroupIndex: number, currentFilterText?: string };

export default function TopicGroupList({
  topicGroups,
  availableTopicNames,
  displayNameByTopic,
  onTopicGroupsChange,
  dataTestShowErrors,
  onAddGroup,
  sceneCollectors,
}: Props) {
  const [groupEditingState, setGroupEditingState] = useState<?TopicGroupEditingState>(undefined);
  const [topicSettingsObjectPath, setTopicSettingsObjectPath] = useState<?string>();

  const {
    onCloseGroupEditModal,
    onCloseTopicSettingsModal,
    onOpenEditTopicSettingsModal,
    onOpenGroupEditModal,
  } = useMemo(() => {
    return {
      onCloseGroupEditModal: () => setGroupEditingState(undefined),
      onCloseTopicSettingsModal: () => setTopicSettingsObjectPath(undefined),
      onOpenEditTopicSettingsModal: (objectPath: string) => setTopicSettingsObjectPath(objectPath),
      onOpenGroupEditModal: (newGroupEditingState: TopicGroupEditingState) =>
        setGroupEditingState(newGroupEditingState),
    };
  }, []);

  const onSortEnd = ({ oldIndex, newIndex, ...rest }) => {
    // Move the dragged item from the oldIndex to the newIndex
    const movingItem = topicGroups[oldIndex];
    const newItems = [...topicGroups];
    newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, movingItem);
    onTopicGroupsChange("", newItems);
  };

  return (
    <div>
      <RenderToBodyComponent>
        <>
          {topicSettingsObjectPath && (
            <Modal
              onRequestClose={onCloseTopicSettingsModal}
              contentStyle={{
                maxHeight: "calc(100vh - 200px)",
                maxWidth: 480,
                display: "flex",
                flexDirection: "column",
              }}>
              <TopicSettingsEditor
                objectPath={topicSettingsObjectPath}
                onTopicGroupsChange={onTopicGroupsChange}
                sceneCollectors={sceneCollectors}
                topicGroups={topicGroups}
              />
            </Modal>
          )}
          {groupEditingState != null && (
            <Modal
              onRequestClose={onCloseGroupEditModal}
              contentStyle={{
                maxHeight: "calc(100vh - 200px)",
                minHeight: 300,
                maxWidth: 800,
                display: "flex",
                flexDirection: "column",
              }}>
              <TopicGroupEdit
                availableTopicNames={availableTopicNames}
                displayNameByTopic={displayNameByTopic}
                objectPath={`[${groupEditingState.topicGroupIndex}]`}
                onTopicGroupsChange={onTopicGroupsChange}
                topicGroup={topicGroups[groupEditingState.topicGroupIndex]}
                onCloseModal={onCloseGroupEditModal}
                {...(groupEditingState.currentFilterText
                  ? { defaultFilterText: groupEditingState.currentFilterText }
                  : {})}
              />
            </Modal>
          )}
        </>
      </RenderToBodyComponent>
      {!topicGroups.length && (
        <SEmptyState>
          Nothing here yet. Add groups to get started.
          <div style={{ padding: 16 }}>
            <CreateGroupButton
              availableTopicNames={availableTopicNames}
              displayNameByTopic={displayNameByTopic}
              onAddGroup={onAddGroup}
            />
          </div>
        </SEmptyState>
      )}
      {topicGroups.length > 0 && (
        <SortableList useDragHandle onSortEnd={onSortEnd}>
          {topicGroups.map(
            (topicGroup, idx) =>
              topicGroup.derivedFields.isShownInList && (
                <SortableItem
                  availableTopicNames={availableTopicNames}
                  dataTestShowErrors={dataTestShowErrors}
                  displayNameByTopic={displayNameByTopic}
                  index={idx}
                  topicGroupIndex={idx}
                  key={topicGroup.derivedFields.id}
                  objectPath={`[${idx}]`}
                  onOpenEditTopicSettingsModal={onOpenEditTopicSettingsModal}
                  onOpenGroupEditModal={onOpenGroupEditModal}
                  onTopicGroupsChange={onTopicGroupsChange}
                  topicGroup={topicGroup}
                />
              )
          )}
        </SortableList>
      )}
    </div>
  );
}
