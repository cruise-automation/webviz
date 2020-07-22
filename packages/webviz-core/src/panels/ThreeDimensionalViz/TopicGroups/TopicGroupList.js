// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
// eslint-disable-next-line no-restricted-imports
import { get } from "lodash";
import React, { useMemo, useState, useCallback } from "react";
import { SortableContainer, SortableElement } from "react-sortable-hoc";

import Accordion from "./Accordion";
import TopicGroupBody from "./TopicGroupBody";
import TopicGroupEdit from "./TopicGroupEdit";
import TopicGroupHeader from "./TopicGroupHeader";
import TopicGroupsEmptyState from "./TopicGroupsEmptyState";
import TopicSettingsEditor from "./TopicSettingsEditor";
import type { TopicGroupType, OnTopicGroupsChange, TopicGroupConfig } from "./types";
import Modal from "webviz-core/src/components/Modal";
import { RenderToBodyComponent } from "webviz-core/src/components/renderToBody";

type Props = {|
  availableTopicNames: string[],
  dataTestShowErrors: boolean,
  displayNameByTopic: { [topicName: string]: string },
  onAddGroup: (newTopicGroupConfig: TopicGroupConfig) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  sceneCollectorMsgForTopicSetting: any,
  setSettingsTopicName: (topicName: ?string) => void,
  topicGroups: TopicGroupType[],
|};

type SortableItemProps = {|
  availableTopicNames: string[],
  dataTestShowErrors: boolean,
  displayNameByTopic: { [topicName: string]: string },
  objectPath: string,
  onOpenEditTopicSettingsModal: (objectPath: string) => void,
  onOpenGroupEditModal: ({ topicGroupIndex: number, currentFilterText?: string }) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  topicGroup: TopicGroupType,
  topicGroupIndex: number,
|};

const SortableItem = SortableElement(
  ({
    availableTopicNames,
    dataTestShowErrors,
    displayNameByTopic,
    objectPath,
    onOpenEditTopicSettingsModal,
    onOpenGroupEditModal,
    onTopicGroupsChange,
    topicGroup,
    topicGroupIndex,
  }: SortableItemProps) => {
    const onToggleExpand = useCallback(() => onTopicGroupsChange(`${objectPath}.expanded`, !topicGroup.expanded), [
      objectPath,
      onTopicGroupsChange,
      topicGroup.expanded,
    ]);

    return (
      <li style={{ listStyle: "none" }}>
        <Accordion
          active={topicGroup.derivedFields.expanded}
          onToggle={onToggleExpand}
          renderHeader={({ onToggle }) => (
            <TopicGroupHeader
              objectPath={objectPath}
              onOpenGroupEditModal={onOpenGroupEditModal}
              onToggleExpand={onToggle}
              onTopicGroupsChange={onTopicGroupsChange}
              topicGroup={topicGroup}
              topicGroupIndex={topicGroupIndex}
              hasBaseColumn={availableTopicNames.length > 0}
            />
          )}>
          <TopicGroupBody
            availableTopicNames={availableTopicNames}
            dataTestShowErrors={dataTestShowErrors}
            displayNameByTopic={displayNameByTopic}
            objectPath={objectPath}
            onOpenEditTopicSettingsModal={onOpenEditTopicSettingsModal}
            onOpenGroupEditModal={onOpenGroupEditModal}
            onTopicGroupsChange={onTopicGroupsChange}
            topicGroup={topicGroup}
            topicGroupIndex={topicGroupIndex}
          />
        </Accordion>
      </li>
    );
  }
);

const SortableList = SortableContainer(({ children }) => <ul>{children}</ul>);

type TopicGroupEditingState = { topicGroupIndex: number, currentFilterText?: string };

export default function TopicGroupList({
  availableTopicNames,
  dataTestShowErrors,
  displayNameByTopic,
  onAddGroup,
  onTopicGroupsChange,
  sceneCollectorMsgForTopicSetting,
  setSettingsTopicName,
  topicGroups,
}: Props) {
  const [groupEditingState, setGroupEditingState] = useState<?TopicGroupEditingState>(undefined);
  const [settingsByKeyObjectPath, setTopicSettingsObjectPath] = useState<?string>();

  const {
    onCloseGroupEditModal,
    onCloseTopicSettingsModal,
    onOpenEditTopicSettingsModal,
    onOpenGroupEditModal,
  } = useMemo(
    () => {
      return {
        onCloseGroupEditModal: () => setGroupEditingState(undefined),
        onCloseTopicSettingsModal: () => setTopicSettingsObjectPath(undefined),
        onOpenEditTopicSettingsModal: (objectPath: string) => {
          const topicItem = get(topicGroups, objectPath);
          if (!topicItem) {
            throw new Error(`This should never happen. objectPath for topic item (${objectPath}) is invalid.`);
          }
          // Set the settings topic at the top level in order to trigger changes related to SceneBuilder.
          setSettingsTopicName(topicItem.topicName);
          setTopicSettingsObjectPath(objectPath);
        },
        onOpenGroupEditModal: (newGroupEditingState: TopicGroupEditingState) =>
          setGroupEditingState(newGroupEditingState),
      };
    },
    [setSettingsTopicName, topicGroups]
  );

  const onSortEnd = ({ oldIndex, newIndex }) => {
    // Move the dragged item from the oldIndex to the newIndex
    const movingItem = topicGroups[oldIndex];
    const newItems = [...topicGroups];
    newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, movingItem);
    onTopicGroupsChange("", newItems);
  };

  return (
    <div id="topic-group-listbox" role="listbox" aria-labelledby="topic-group-label">
      <RenderToBodyComponent>
        <>
          {settingsByKeyObjectPath && (
            <Modal
              onRequestClose={onCloseTopicSettingsModal}
              contentStyle={{
                maxHeight: "calc(100vh - 200px)",
                maxWidth: 480,
                display: "flex",
                flexDirection: "column",
              }}>
              <TopicSettingsEditor
                objectPath={settingsByKeyObjectPath}
                onTopicGroupsChange={onTopicGroupsChange}
                sceneCollectorMsgForTopicSetting={sceneCollectorMsgForTopicSetting}
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
        <TopicGroupsEmptyState
          availableTopicNames={availableTopicNames}
          displayNameByTopic={displayNameByTopic}
          onAddGroup={onAddGroup}
        />
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
                  key={topicGroup.derivedFields.id}
                  objectPath={`[${idx}]`}
                  onOpenEditTopicSettingsModal={onOpenEditTopicSettingsModal}
                  onOpenGroupEditModal={onOpenGroupEditModal}
                  onTopicGroupsChange={onTopicGroupsChange}
                  topicGroup={topicGroup}
                  topicGroupIndex={idx}
                />
              )
          )}
        </SortableList>
      )}
    </div>
  );
}
