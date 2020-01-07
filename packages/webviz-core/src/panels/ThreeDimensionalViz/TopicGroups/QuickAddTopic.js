// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Icon } from "antd";
import Downshift from "downshift";
import fuzzySort from "fuzzysort";
import { difference } from "lodash";
import React, { useMemo, useCallback, useState } from "react";
import styled from "styled-components";

import TopicNameDisplay from "./TopicNameDisplay";
import type { TopicGroupType, OnTopicGroupsChange, QuickAddTopicItem } from "./types";
import Modal from "webviz-core/src/components/Modal";
import renderToBody from "webviz-core/src/components/renderToBody";
import { colors } from "webviz-core/src/util/colors";
import naturalSort from "webviz-core/src/util/naturalSort";

const SAddContainer = styled.div`
  border-radius: 4px;
  background: ${colors.TOOLBAR};
  width: 100%;
`;

export const SInputWrapper = styled.div`
  background: ${colors.TOOLBARL1};
  display: flex;
  padding: 8px;
  align-items: center;
`;

export const SInput = styled.input`
  margin-left: 8px;
  background: transparent;
  flex: 1;
  border: none;
  :focus,
  :hover {
    outline: none;
  }
`;

export const SOptionsWrapper = styled.div`
  position: relative;
  padding-bottom: 44px;
  background: ${colors.TOOLBAR};
`;

export const SOptions = styled.ul`
  max-height: ${(props) => (props.isSingleAdd ? "200px" : "100%")};
  margin: 0;
  max-height: 200px;
  padding: 4px 0;
  transition: 0.3s;
  padding-bottom: 44px;
  overflow: auto;
`;

export const SOption = styled.li`
  transition: 0.3s;
  padding: 4px 8px;
  list-style: none;
  margin: 0 0 4px 0;
  color: ${(props) => (props.fade ? colors.TEXT_MUTED : "unset")};
  cursor: pointer;
  :hover {
    background: ${colors.PURPLE};
    font-size: bold;
  }
`;

export const SCreateOption = styled.div`
  padding: 8px;
  background: ${colors.PURPLE};
  word-break: break-all;
`;

const SBrowseAll = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  text-align: right;
  align-items: center;
  padding: 8px;
  background: ${colors.TOOLBARL1};
`;

const SBrowseButton = styled.button`
  color: ${colors.HIGHLIGHT};
  background: transparent;
  border: none;
  cursor: pointer;
`;

function isTopicName(topicName: string): boolean {
  return topicName.startsWith("/") && topicName.length > 1;
}

function getFilteredItems(items: QuickAddTopicItem[], searchText?: string): QuickAddTopicItem[] {
  if (!searchText) {
    return items;
  }
  return fuzzySort
    .go(searchText, items, {
      // Fuzzy search on topicName and displayName
      // Note for adding multiple topics through available topics and topic tree view, we are not weighing
      // `disabled` (topics that have been added to the group already), so we don't have to tweak score and threshold accordingly.
      // Instead, we'll just partition after the result is generated.
      keys: ["topicName", "displayName"],
    })
    .map((searchResult) => searchResult.obj);
}

type AddTopicProps = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  onAddTopicItem: ({ [topicName: string]: string }) => void,
  onBrowseTopics: () => void,
  topicGroup: TopicGroupType,
|};

function AddTopic({
  availableTopicNames,
  displayNameByTopic,
  onAddTopicItem,
  onBrowseTopics,
  topicGroup,
}: AddTopicProps) {
  const existingGroupTopicsSet = useMemo(() => new Set(topicGroup.items.map((item) => item.topicName)), [
    topicGroup.items,
  ]);

  const itemsToRender = useMemo(
    () => {
      return difference(availableTopicNames, [...existingGroupTopicsSet])
        .sort(naturalSort())
        .map((topicName) => ({
          topicName,
          ...(displayNameByTopic[topicName] ? { displayName: displayNameByTopic[topicName] } : undefined),
        }));
    },
    [availableTopicNames, existingGroupTopicsSet, displayNameByTopic]
  );

  return (
    <Downshift
      onChange={(selection) => onAddTopicItem(selection)}
      itemToString={(item) => (item ? item.topicName : "")}>
      {({ getInputProps, getItemProps, getMenuProps, inputValue, getRootProps }) => {
        const filteredItems = getFilteredItems(itemsToRender, inputValue);
        const showCreateOption =
          isTopicName(inputValue) &&
          !existingGroupTopicsSet.has(inputValue.trim()) &&
          !availableTopicNames.includes({ topicName: inputValue.trim() });

        return (
          <SAddContainer>
            <SInputWrapper {...getRootProps({}, { suppressRefError: true })}>
              <Icon type="search" />
              <SInput
                data-test="quick-add-topic-input"
                placeholder="Find a topic to add"
                {...getInputProps({
                  onKeyDown: (event) => {
                    if (event.key === "Enter" && showCreateOption) {
                      // Prevent Downshift's default 'Enter' behavior if create option is available.
                      event.preventDownshiftDefault = true;
                      onAddTopicItem({ topicName: inputValue.trim() });
                    }
                  },
                })}
              />
            </SInputWrapper>
            <SOptionsWrapper>
              {showCreateOption && (
                <SCreateOption>
                  Press enter to add topic: <b>{inputValue}</b>
                </SCreateOption>
              )}
              {filteredItems.length === 0 ? (
                <p>No topics found to add.</p>
              ) : (
                <SOptions isSingleAdd {...getMenuProps()}>
                  {filteredItems.map((item, index) => (
                    <SOption
                      key={item.topicName}
                      data-test={`quick-add-topic-option_${item.topicName}`}
                      {...getItemProps({
                        key: item.topicName,
                        index,
                        item,
                      })}>
                      <TopicNameDisplay
                        displayName={item.displayName || item.topicName}
                        topicName={item.topicName}
                        searchText={inputValue}
                      />
                    </SOption>
                  ))}
                </SOptions>
              )}
              <SBrowseAll>
                <SBrowseButton onClick={onBrowseTopics}>
                  Browse all topics <Icon type="right" />
                </SBrowseButton>
              </SBrowseAll>
            </SOptionsWrapper>
          </SAddContainer>
        );
      }}
    </Downshift>
  );
}

type Props = {|
  topicGroup: TopicGroupType,
  objectPath: string,
  onTopicGroupsChange: OnTopicGroupsChange,
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  testShowAddView?: boolean,
|};

export default function QuickAddTopic({
  topicGroup,
  objectPath,
  onTopicGroupsChange,
  availableTopicNames,
  displayNameByTopic,
  testShowAddView,
}: Props) {
  const [showAddView, setShowAddView] = useState(testShowAddView || false);
  const [_, setShowModal] = useState(false);

  const onBrowseTopics = useCallback(() => {
    const modal = renderToBody(
      <Modal
        onRequestClose={() => {
          setShowModal(false);
          modal.remove();
        }}
        contentStyle={{ maxHeight: "calc(100vh - 200px)", width: 480, display: "flex", flexDirection: "column" }}>
        <div>TODO(Audrey): add the browse view </div>
      </Modal>
    );
  }, []);

  const onAddTopicItem = useCallback(
    (newItem: { [topicName: string]: string }) => {
      onTopicGroupsChange(objectPath, [...topicGroup.items, newItem]);
      setShowAddView(false);
    },
    [objectPath, onTopicGroupsChange, topicGroup.items]
  );

  return (
    <div>
      {!showAddView && <SBrowseButton onClick={() => setShowAddView(true)}>+ Add topic</SBrowseButton>}
      {showAddView && (
        <AddTopic
          availableTopicNames={availableTopicNames}
          displayNameByTopic={displayNameByTopic}
          onAddTopicItem={onAddTopicItem}
          onBrowseTopics={onBrowseTopics}
          topicGroup={topicGroup}
        />
      )}
    </div>
  );
}
