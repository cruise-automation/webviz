// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CloseIcon from "@mdi/svg/svg/close.svg";
import { Icon } from "antd";
import Downshift from "downshift";
import fuzzySort from "fuzzysort";
import { difference } from "lodash";
import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import styled from "styled-components";

import { ITEM_MAIN_PADDING_LEFT, ICON_TOTAL_SIZE, ICON_PADDING } from "./constants";
import TopicNameDisplay from "./TopicNameDisplay";
import type { TopicGroupType, OnTopicGroupsChange, QuickAddTopicItem } from "./types";
import Button from "webviz-core/src/components/Button";
import WebvizIcon from "webviz-core/src/components/Icon";
import { colors } from "webviz-core/src/util/colors";
import naturalSort from "webviz-core/src/util/naturalSort";

const SQuickAddTopic = styled.div`
  padding: 4px 4px 4px ${ITEM_MAIN_PADDING_LEFT - ICON_TOTAL_SIZE - 12}px;
  background: ${({ showAddView }: { showAddView: boolean }) => (showAddView ? colors.TOOLBARL1 : "unset")};
`;

const SShowAddWrapper = styled.div`
  transition: 0.3s;
  position: relative;
  height: ${({ showAddView }: { showAddView: boolean }) => (showAddView ? "256px" : "0")};
`;

const SAddContainer = styled.div`
  border-radius: 4px;
  background: ${colors.DARK1};
  width: 100%;
`;

export const SInputWrapper = styled.div`
  background: ${colors.DARK6};
  display: flex;
  padding: 4px 8px;
  align-items: center;
  flex: 1;
  position: sticky;
  top: 0;
`;

export const SInput = styled.input`
  background: transparent;
  flex: 1;
  font-size: 14px;
  margin-left: 4px;
  padding: 4px 8px;
  border: none;
  :focus,
  :hover {
    outline: none;
    background: transparent;
  }
`;

export const SOptionsWrapper = styled.div`
  position: relative;
  height: 182px;
`;

const SOptions = styled.ul`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: auto;
`;

export const SOption = styled.li`
  transition: 0.3s;
  padding: 8px 16px;
  margin: 0;
  list-style: none;
  color: ${(props) => (props.fade ? colors.TEXT_MUTED : "unset")};
  cursor: pointer;
  :hover {
    background-color: ${colors.HOVER_BACKGROUND_COLOR};
    font-size: bold;
  }
`;

export const SActionWrapper = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  text-align: right;
  align-items: center;
  padding: 4px 0;
  background: ${colors.DARK2};
`;

export const SBrowseButton = styled(Button)`
  color: ${colors.HIGHLIGHT};
  background: transparent;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  :hover {
    background: rgba(247, 247, 243, 0.1);
  }
`;

export function isTopicName(topicName: string): boolean {
  return topicName.startsWith("/") && topicName.length > 1;
}

function getFilteredItems(items: QuickAddTopicItem[], searchText?: string): QuickAddTopicItem[] {
  return searchText
    ? fuzzySort
        .go(searchText, items, {
          // Fuzzy search on topicName and displayName
          // Note for adding multiple topics through available topics and topic tree view, we are not weighing
          // `disabled` (topics that have been added to the group already), so we don't have to tweak score and threshold accordingly.
          // Instead, we'll just partition after the result is generated.
          keys: ["topicName", "displayName"],
          limit: 50,
          allowTypo: false,
          threshold: -10000,
        })
        .map((searchResult) => searchResult.obj)
    : items;
}

type AddTopicProps = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  onAddTopicItem: ({ [topicName: string]: string }) => void,
  onCloseQuickAdd: () => void,
  onGroupEditClick: (currentFilterText: string) => void,
  topicGroup: TopicGroupType,
|};

function AddTopic({
  availableTopicNames,
  displayNameByTopic,
  onAddTopicItem,
  onCloseQuickAdd,
  onGroupEditClick,
  topicGroup,
}: AddTopicProps) {
  const inputRef = useRef<?HTMLInputElement>(undefined);
  useEffect(() => {
    // auto focus on input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const existingGroupTopicsSet = useMemo(() => new Set(topicGroup.items.map((item) => item.topicName)), [
    topicGroup.items,
  ]);

  const allItems = useMemo(
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
      {({ getInputProps, getItemProps, getMenuProps, inputValue, getRootProps, highlightedIndex }) => {
        const trimmedInputVal = inputValue.trim();

        const filteredItems = getFilteredItems(allItems, trimmedInputVal);
        const showCreateOption =
          isTopicName(trimmedInputVal) &&
          !existingGroupTopicsSet.has(trimmedInputVal) &&
          !availableTopicNames.includes(trimmedInputVal);
        const itemsToRender = showCreateOption ? [{ topicName: trimmedInputVal }, ...filteredItems] : filteredItems;

        return (
          <SAddContainer>
            <SInputWrapper {...getRootProps({}, { suppressRefError: true })}>
              <Icon type="search" />
              <SInput
                ref={inputRef}
                data-test="quick-add-topic-input"
                placeholder="Find a topic to add"
                {...getInputProps({
                  onKeyDown: (event) => {
                    // Select the item directly when pressed space bar, and the behavior will be the same when adding multi topics through All/Popular list.
                    if (event.key === " " && highlightedIndex != null) {
                      const highlightedItem = itemsToRender[highlightedIndex];
                      onAddTopicItem(highlightedItem);
                    } else if (event.key === "Enter" && showCreateOption && highlightedIndex == null) {
                      // Create a new item when pressed enter without selecting any items.
                      event.preventDownshiftDefault = true;
                      onAddTopicItem({ topicName: trimmedInputVal });
                    }
                  },
                })}
              />
              <WebvizIcon fade onClick={onCloseQuickAdd} medium>
                <CloseIcon />
              </WebvizIcon>
            </SInputWrapper>
            <SOptionsWrapper>
              {itemsToRender.length === 0 ? (
                <p style={{ padding: 8 }}>No topics found to add.</p>
              ) : (
                <SOptions isSingleAdd {...getMenuProps()}>
                  {itemsToRender.map((item, index) => (
                    <SOption
                      key={item.topicName}
                      data-test={`quick-add-topic-option_${item.topicName}`}
                      {...getItemProps({
                        key: item.topicName,
                        index,
                        item,
                        style: {
                          backgroundColor: highlightedIndex === index ? colors.HOVER_BACKGROUND_COLOR : "unset",
                        },
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
            </SOptionsWrapper>
            <SActionWrapper>
              <SBrowseButton onClick={() => onGroupEditClick(trimmedInputVal)}>
                Edit group <Icon type="right" style={{ padding: `4px 0 0 ${ICON_PADDING}px ` }} />
              </SBrowseButton>
            </SActionWrapper>
          </SAddContainer>
        );
      }}
    </Downshift>
  );
}

type Props = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  objectPath: string,
  onShowGroupEditModal: (currentFilterText: string) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  topicGroup: TopicGroupType,
  testShowAddView?: boolean,
|};

export default function QuickAddTopic({
  availableTopicNames,
  displayNameByTopic,
  objectPath,
  onShowGroupEditModal,
  onTopicGroupsChange,
  topicGroup,
  testShowAddView,
}: Props) {
  const [showAddView, setShowAddView] = useState(testShowAddView || false);
  const onAddTopicItem = useCallback(
    (newItem: { [topicName: string]: string }) => {
      onTopicGroupsChange(`${objectPath}.items`, [...topicGroup.items, newItem]);
      setShowAddView(false);
    },
    [objectPath, onTopicGroupsChange, topicGroup.items]
  );

  const onGroupEditClick = useCallback(
    (currentFilterText: string) => {
      setShowAddView(false);
      onShowGroupEditModal(currentFilterText);
    },
    [onShowGroupEditModal]
  );

  const onCloseQuickAdd = useCallback(() => setShowAddView(false), []);

  return (
    <SQuickAddTopic showAddView={showAddView}>
      {!showAddView && (
        <SBrowseButton data-test="show-add-view-btn" onClick={() => setShowAddView(true)}>
          <Icon type="plus" style={{ padding: "4px 10px 0 0" }} />
          New topic
        </SBrowseButton>
      )}
      <SShowAddWrapper showAddView={showAddView}>
        {showAddView && (
          <AddTopic
            availableTopicNames={availableTopicNames}
            displayNameByTopic={displayNameByTopic}
            onAddTopicItem={onAddTopicItem}
            onGroupEditClick={onGroupEditClick}
            topicGroup={topicGroup}
            onCloseQuickAdd={onCloseQuickAdd}
          />
        )}
      </SShowAddWrapper>
    </SQuickAddTopic>
  );
}
