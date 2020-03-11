// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tabs } from "antd";
import { keyBy, cloneDeep } from "lodash";
import React, { useState, useMemo, useCallback } from "react";
import styled from "styled-components";

import AddFromAllTopics from "./AddFromAllTopics";
import AddFromPopularTopics from "./AddFromPopularTopics";
import { getDefaultTopicItemConfig } from "./topicGroupsUtils";
import type { TopicGroupType, OnTopicGroupsChange } from "./types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const SGroupEdit = styled.div`
  border-radius: 4px;
  background: ${colors.TOOLBAR};
  width: 480px;
  display: flex;
  flex-direction: column;
`;

export const STabsWrapper = styled.div`
  flex: 1;
  position: relative;
`;

export const SEditableName = styled.div`
  display: flex;
  align-items: center;
  margin-right: 32px;
  padding: 8px;
  width: 90%;
`;

export const STabItemWrapper = styled.div`
  /* the Modal height is 100vh - 200px, and the displayName input + vertical spacing around is 96px */
  height: calc(100vh - 296px);
  max-height: 800px;
  flex: 1;
  position: relative;
`;

export const SEditableNameInput = styled.input`
  background: ${colors.DARK6};
  padding: 8px 12px;
  border: none;
  flex: 1;
  margin-right: 8px;
  font-size: 16px;
`;

type Props = {|
  availableTopicNames: string[],
  defaultFilterText?: string,
  displayNameByTopic: { [topicName: string]: string },
  objectPath: string,
  onCloseModal: () => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  topicGroup: TopicGroupType,
  testDefaultTabKey?: string,
|};

export default function GroupEdit({
  availableTopicNames = [],
  defaultFilterText,
  displayNameByTopic = {},
  objectPath,
  onCloseModal,
  onTopicGroupsChange,
  topicGroup,
  testDefaultTabKey,
}: Props) {
  const [groupDisplayName, setGroupDisplayName] = useState(topicGroup.displayName);
  const existingGroupTopicsSet = useMemo(() => new Set(topicGroup.items.map((item) => item.topicName)), [
    topicGroup.items,
  ]);

  const onSave = useCallback(
    (checkedTopics) => {
      const newGroup = cloneDeep(topicGroup);
      newGroup.displayName = groupDisplayName;
      const existingItemsByTopic = keyBy(topicGroup.items, "topicName");
      newGroup.items = checkedTopics.map(
        // Copy the existing item fields.
        (topicName) => existingItemsByTopic[topicName] || getDefaultTopicItemConfig(topicName)
      );
      onTopicGroupsChange(objectPath, newGroup);
    },
    [groupDisplayName, objectPath, onTopicGroupsChange, topicGroup]
  );

  return (
    <SGroupEdit className="ant-component">
      <div>
        <SEditableName>
          <SEditableNameInput
            style={{ fontSize: 16 }}
            value={groupDisplayName}
            onChange={(ev) => setGroupDisplayName(ev.target.value)}
          />
        </SEditableName>
      </div>
      <STabsWrapper className="ant-component">
        <Tabs defaultActiveKey={testDefaultTabKey || "1"}>
          <Tabs.TabPane tab="All topics" key="1">
            <STabItemWrapper>
              <AddFromAllTopics
                availableTopicNames={availableTopicNames}
                defaultFilterText={defaultFilterText}
                existingGroupTopicsSet={existingGroupTopicsSet}
                displayNameByTopic={displayNameByTopic}
                onCloseModal={onCloseModal}
                onSave={onSave}
              />
            </STabItemWrapper>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Popular topics" key="2">
            <STabItemWrapper>
              <AddFromPopularTopics
                defaultFilterText={defaultFilterText}
                existingGroupTopicsSet={existingGroupTopicsSet}
                onCloseModal={onCloseModal}
                onSave={onSave}
              />
            </STabItemWrapper>
          </Tabs.TabPane>
        </Tabs>
      </STabsWrapper>
    </SGroupEdit>
  );
}
