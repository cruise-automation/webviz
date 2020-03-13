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
import React, { useMemo, useCallback, useState, useRef, useEffect, useContext } from "react";
import KeyListener from "react-key-listener";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";

import { ITEM_MAIN_PADDING_LEFT, ICON_TOTAL_SIZE, ICON_PADDING } from "./constants";
import KeyboardFocusIndex from "./KeyboardFocusIndex";
import { KeyboardContext } from "./TopicGroups";
import { getDefaultTopicItemConfig, removeBlankSpaces } from "./topicGroupsUtils";
import TopicNameDisplay from "./TopicNameDisplay";
import type { TopicGroupType, OnTopicGroupsChange, QuickAddTopicItem } from "./types";
import Button from "webviz-core/src/components/Button";
import WebvizIcon from "webviz-core/src/components/Icon";
import naturalSort from "webviz-core/src/util/naturalSort";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SQuickAddTopic = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  padding: ${({ showAddView }) => `4px 4px 4px ${showAddView ? 4 : ITEM_MAIN_PADDING_LEFT - ICON_TOTAL_SIZE - 12}`}px;
  background: ${({ showAddView, highlighted }: { showAddView: boolean, highlighted: boolean }) =>
    highlighted ? colors.HOVER_BACKGROUND_COLOR : "unset"};
`;

const SShowAddWrapper = styled.div`
  display: flex;
  flex: 1;
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
  padding: 0 16px;
  margin: 0;
  display: flex;
  align-items: center;
  list-style: none;
  color: ${(props) => (props.fade ? colors.TEXT_MUTED : "unset")};
  background-color: ${(props) => (props.highlighted ? colors.HOVER_BACKGROUND_COLOR : "unset")};
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

export function getIsTopicName(topicName: string): boolean {
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

type Item = {| topicName: string, displayName?: string |};
type GetItemProp = {| key: string, index: number, item: Item, style: { [attr: string]: string | number } |};
type ItemRendererProps = {|
  isScrolling: ?boolean,
  index: number,
  style: { [attr: string]: string | number },
  data: {|
    items: Item[],
    getItemProps: (GetItemProp) => GetItemProp,
    highlightedIndex: number,
    searchText: string,
  |},
|};

function ItemRenderer({
  index,
  style,
  data: { items, getItemProps, highlightedIndex, searchText },
}: ItemRendererProps) {
  const item = items[index];
  return (
    <SOption
      data-test={`quick-add-topic-option_${item.topicName}`}
      highlighted={highlightedIndex === index}
      {...getItemProps({ key: item.topicName, index, item, style })}>
      <TopicNameDisplay
        displayName={item.displayName || item.topicName}
        topicName={item.topicName}
        searchText={searchText}
      />
    </SOption>
  );
}

type AddTopicProps = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  searchText: string,
  onAddTopicItem: ({ [topicName: string]: string }) => void,
  onCloseQuickAdd: () => void,
  onGroupEditClick: (currentFilterText: string) => void,
  setSearchText: (string) => void,
  topicGroup: TopicGroupType,
|};

function AddTopic({
  availableTopicNames,
  displayNameByTopic,
  searchText,
  onAddTopicItem,
  onCloseQuickAdd,
  onGroupEditClick,
  setSearchText,
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
      {({ getInputProps, getItemProps, getMenuProps, getRootProps, highlightedIndex }) => {
        const isTopicName = getIsTopicName(searchText);
        const maybeTopicName = isTopicName ? removeBlankSpaces(searchText) : searchText;

        const filteredItems = getFilteredItems(allItems, searchText);
        const showCreateOption =
          isTopicName && !existingGroupTopicsSet.has(maybeTopicName) && !availableTopicNames.includes(maybeTopicName);
        const itemsToRender = showCreateOption ? [{ topicName: maybeTopicName }, ...filteredItems] : filteredItems;

        return (
          <SAddContainer>
            <SInputWrapper {...getRootProps({}, { suppressRefError: true })}>
              <Icon type="search" />
              <SInput
                ref={inputRef}
                data-test="quick-add-topic-input"
                placeholder="Find a topic to add"
                {...getInputProps({
                  onChange: (ev) => {
                    ev.preventDefault();
                    setSearchText(ev.target.value);
                  },
                  value: searchText,
                  onKeyDown: (event) => {
                    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                      // Prevent topic group container from handling the event since the user can use ArrowUp/Down to navigate the quick add options.
                      event.stopPropagation();
                    }
                    // Select the item directly when pressed space bar, and the behavior will be the same when adding multi topics through All/Popular list.
                    if (event.key === " " && highlightedIndex != null) {
                      const highlightedItem = itemsToRender[highlightedIndex];
                      onAddTopicItem(highlightedItem);
                    } else if (event.key === "Enter" && showCreateOption && highlightedIndex == null) {
                      // Create a new item when pressed enter without selecting any items.
                      event.preventDownshiftDefault = true;
                      onAddTopicItem({ topicName: maybeTopicName });
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
                <AutoSizer>
                  {({ height, width }) => (
                    <SOptions isSingleAdd {...getMenuProps()}>
                      <List
                        width={width}
                        height={height}
                        itemCount={itemsToRender.length}
                        itemSize={44}
                        itemData={{
                          getItemProps,
                          highlightedIndex,
                          items: itemsToRender,
                          searchText: isTopicName ? maybeTopicName : searchText,
                        }}>
                        {ItemRenderer}
                      </List>
                    </SOptions>
                  )}
                </AutoSizer>
              )}
            </SOptionsWrapper>
            <SActionWrapper>
              <SBrowseButton onClick={() => onGroupEditClick(searchText)}>
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
  topicGroup: {
    derivedFields: { addTopicKeyboardFocusIndex },
  },
  testShowAddView,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const { focusIndex, setFocusIndex, focusItemOp, onFocusOnContainer, setFocusItemOp } = useContext(KeyboardContext);
  const highlighted = focusIndex !== -1 && focusIndex === addTopicKeyboardFocusIndex;
  const [showAddView, setShowAddView] = useState(testShowAddView || false);
  const onAddTopicItem = useCallback(
    ({ topicName }: { [topicName: string]: string }) => {
      onTopicGroupsChange(`${objectPath}.items`, [...topicGroup.items, getDefaultTopicItemConfig(topicName)]);
      setShowAddView(false);
      onFocusOnContainer();
    },
    [objectPath, onFocusOnContainer, onTopicGroupsChange, topicGroup.items]
  );

  useEffect(
    () => {
      // Open quick add view upon pressing `Enter` key
      if (highlighted && focusItemOp && focusItemOp === "Enter") {
        setShowAddView(!showAddView);
        setFocusItemOp(undefined);
      }
    },
    [focusItemOp, highlighted, setFocusItemOp, showAddView]
  );

  const onGroupEditClick = useCallback(
    (currentFilterText: string) => {
      setShowAddView(false);
      onShowGroupEditModal(currentFilterText);
    },
    [onShowGroupEditModal]
  );

  const onCloseQuickAdd = useCallback(
    () => {
      setShowAddView(false);
      onFocusOnContainer();
    },
    [onFocusOnContainer]
  );

  const keyDownHandlers = useMemo(
    () => ({
      Escape: (e) => {
        if (highlighted) {
          // Pressing esc will bring the focus back to the container so the user can continue nav up/down
          e.preventDefault();
          setShowAddView(false);
          onFocusOnContainer();
        }
      },
    }),
    [highlighted, onFocusOnContainer]
  );

  return (
    <SQuickAddTopic
      className={`focus-item-${addTopicKeyboardFocusIndex}`}
      role="option"
      highlighted={highlighted}
      onMouseEnter={(e) => {
        if (!highlighted) {
          setFocusIndex(addTopicKeyboardFocusIndex);
        }
      }}
      showAddView={showAddView}>
      <KeyListener keyDownHandlers={keyDownHandlers} />
      <KeyboardFocusIndex highlighted={highlighted} keyboardFocusIndex={addTopicKeyboardFocusIndex} />
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
            searchText={searchText}
            onAddTopicItem={onAddTopicItem}
            onCloseQuickAdd={onCloseQuickAdd}
            onGroupEditClick={onGroupEditClick}
            setSearchText={setSearchText}
            topicGroup={topicGroup}
          />
        )}
      </SShowAddWrapper>
    </SQuickAddTopic>
  );
}
