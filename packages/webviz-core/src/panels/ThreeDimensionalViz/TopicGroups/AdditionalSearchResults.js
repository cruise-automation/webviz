// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChevronRightIcon from "@mdi/svg/svg/chevron-right.svg";
import findIndex from "lodash/findIndex";
import React from "react";
import styled from "styled-components";

import DatatypeIcon from "./DatatypeIcon";
import { SBrowseButton } from "./QuickAddTopic";
import TextHighlight from "./TextHighlight";
import { getDefaultNewGroupItemConfig, getDefaultTopicItemConfig } from "./topicGroupsUtils";
import { SIconWrapper } from "./TopicItemRowHeader";
import TopicNameDisplay from "./TopicNameDisplay";
import type { TopicGroupType, OnTopicGroupsChange, TopicGroupConfig, TopicGroupsSearchResult } from "./types";
import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import { type Topic } from "webviz-core/src/players/types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SResultsContainer = styled.div`
  background: ${colors.DARK1};
`;

const SResult = styled.div`
  padding: 4px;
`;
const STopicRow = styled.div`
  padding: 2px 8px 2px 44px;
  display: flex;
`;
const SNamespaceRow = styled.div`
  padding: 4px 8px 4px 70px;
  display: flex;
`;

const STitle = styled.div`
  padding: 6px 6px 6px 44px;
  text-transform: uppercase;
  font-size: 10px;
  color: ${colors.GRAY};
  user-select: none;
`;

const SAddToGroups = styled.div`
  flex: 0 0 auto;
`;

const SGroupButton = styled.button`
  color: ${colors.BLUEL1};
  background: none;
  padding: 0px;
`;

function AddToGroupButton({
  topicGroups,
  topic,
  onTopicGroupsChange,
  onAddGroup,
}: {
  topicGroups: TopicGroupType[],
  topic: Topic,
  onTopicGroupsChange: OnTopicGroupsChange,
  onAddGroup: (newTopicGroupConfig: TopicGroupConfig) => void,
}) {
  // Only show groups that this topic has not already been added to.
  const availableGroups = topicGroups.filter(({ items }) => !items.some(({ topicName }) => topicName === topic.name));
  return (
    <SAddToGroups>
      <Dropdown
        dataTest={`add-to-group-dropdown-${topic.name}`}
        onChange={(value) => {
          if (value === "new") {
            onAddGroup(getDefaultNewGroupItemConfig("Untitled group", [topic.name]));
          } else {
            const groupIndex = findIndex(topicGroups, ({ derivedFields }) => derivedFields.id === value);
            const group = topicGroups[groupIndex];
            onTopicGroupsChange(`[${groupIndex}].items`, [...group.items, getDefaultTopicItemConfig(topic.name)]);
          }
        }}
        toggleComponent={
          <SGroupButton>
            Add topic
            <Icon small>
              <ChevronRightIcon style={{ marginTop: 1 }} />
            </Icon>
          </SGroupButton>
        }>
        {availableGroups.map(({ derivedFields, displayName }) => (
          <option value={derivedFields.id} key={derivedFields.id} data-test={`group-selection-option-${displayName}`}>
            {displayName}
          </option>
        ))}
        {availableGroups.length > 0 && <div style={{ borderTop: `1px solid ${colors.DARK6}` }} />}
        <option value="new" data-test="group-selection-option-New group">
          New group
        </option>
      </Dropdown>
    </SAddToGroups>
  );
}

export default function AdditionalSearchResults({
  searchText,
  filteredSearchResults,
  onTopicGroupsChange,
  displayNameByTopic,
  topicGroups,
  onAddGroup,
  areSearchResultsExpanded,
  setAreSearchResultsExpanded,
}: {|
  searchText: string,
  filteredSearchResults: TopicGroupsSearchResult[],
  onTopicGroupsChange: OnTopicGroupsChange,
  displayNameByTopic: { [topicName: string]: string },
  namespacesByTopic: { [topicName: string]: string[] },
  topicGroups: TopicGroupType[],
  onAddGroup: (newTopicGroupConfig: TopicGroupConfig) => void,
  areSearchResultsExpanded: boolean,
  setAreSearchResultsExpanded: (boolean) => void,
|}) {
  if (!filteredSearchResults.length) {
    return null;
  }

  return (
    <SResultsContainer>
      <STitle>Other available topics</STitle>
      {filteredSearchResults.map(({ topic, namespaces }, index) => {
        return (
          <SResult key={index}>
            <STopicRow>
              <SIconWrapper style={{ marginRight: 4 }}>
                <DatatypeIcon datatype={topic.datatype} />
              </SIconWrapper>
              <TopicNameDisplay
                style={{ flex: "1 1 auto" }}
                topicName={topic.name}
                displayName={displayNameByTopic[topic.name] || topic.name}
                searchText={searchText}
              />
              <AddToGroupButton
                topicGroups={topicGroups}
                topic={topic}
                onTopicGroupsChange={onTopicGroupsChange}
                onAddGroup={onAddGroup}
              />
            </STopicRow>
            {namespaces &&
              namespaces.length > 0 &&
              namespaces.map((namespace) => {
                return (
                  <SNamespaceRow key={namespace}>
                    <TextHighlight targetStr={namespace} searchText={searchText} />
                  </SNamespaceRow>
                );
              })}
          </SResult>
        );
      })}
      {!areSearchResultsExpanded && (
        <SBrowseButton
          onClick={() => setAreSearchResultsExpanded(true)}
          style={{ marginLeft: 8 }}
          className="see-more-results-button">
          See more results
        </SBrowseButton>
      )}
    </SResultsContainer>
  );
}
