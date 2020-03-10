// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tabs } from "antd";
import React, { useState, useMemo, useCallback } from "react";

import AddFromAllTopics from "./AddFromAllTopics";
import AddFromPopularTopics from "./AddFromPopularTopics";
import { SGroupEdit, STabsWrapper, SEditableName, STabItemWrapper, SEditableNameInput } from "./TopicGroupEdit";
import { getDefaultNewGroupItemConfig } from "./topicGroupsUtils";
import type { TopicGroupConfig } from "./types";

type Props = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  onCloseModal: () => void,
  onAddGroup: (newTopicGroup: TopicGroupConfig) => void,
  testDefaultTabKey?: string,
|};

export default React.memo<Props>(function TopicGroupCreate({
  availableTopicNames = [],
  displayNameByTopic = {},
  onCloseModal,
  onAddGroup,
  testDefaultTabKey,
}: Props) {
  const [groupDisplayName, setGroupDisplayName] = useState("Untitled group");
  const existingGroupTopicsSet = useMemo(() => new Set(), []);

  const onSave = useCallback(
    (checkedTopics) => {
      onAddGroup(getDefaultNewGroupItemConfig(groupDisplayName, checkedTopics));
    },
    [groupDisplayName, onAddGroup]
  );
  // Open the topic tree by default if there are no available topics.
  const defaultActiveKey = testDefaultTabKey || availableTopicNames.length ? "1" : "2";

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
        <Tabs defaultActiveKey={defaultActiveKey}>
          <Tabs.TabPane tab="All topics" key="1">
            <STabItemWrapper>
              <AddFromAllTopics
                availableTopicNames={availableTopicNames}
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
});
