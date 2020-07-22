// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChevronRightIcon from "@mdi/svg/svg/chevron-right.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import SearchIcon from "@mdi/svg/svg/magnify.svg";
import PlusIcon from "@mdi/svg/svg/plus.svg";
import Downshift from "downshift";
import fuzzySort from "fuzzysort";
import { difference } from "lodash";
import React, { useMemo, useCallback, useState, useRef, useEffect, useContext } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";

import { ITEM_MAIN_PADDING_LEFT, ICON_TOTAL_SIZE } from "./constants";
import KeyboardFocusIndex from "./KeyboardFocusIndex";
import { KeyboardContext } from "./TopicGroups";
import { getDefaultTopicItemConfig, removeBlankSpaces } from "./topicGroupsUtils";
import TopicNameDisplay from "./TopicNameDisplay";
import type { TopicGroupType, OnTopicGroupsChange, QuickAddTopicItem } from "./types";
import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import KeyListener from "webviz-core/src/components/KeyListener";
import naturalSort from "webviz-core/src/util/naturalSort";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

type StyleProps = {| showAddView: boolean, highlighted: boolean, filterText: string |};
const SQuickAddTopic = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  padding: ${({ showAddView, filterText }: StyleProps) => {
    if (showAddView) {
      return "4px";
    }
    const leftPadding = filterText
      ? ITEM_MAIN_PADDING_LEFT - ICON_TOTAL_SIZE * 3
      : ITEM_MAIN_PADDING_LEFT - ICON_TOTAL_SIZE * 2;
    return `4px 4px 4px ${leftPadding}px`;
  }};
  background: ${({ highlighted }: StyleProps) => (highlighted ? colors.HOVER_BACKGROUND_COLOR : "unset")};
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

function getFilteredItems(items: QuickAddTopicItem[], filterText?: string): QuickAddTopicItem[] {
  return filterText
    ? fuzzySort
        .go(filterText, items, {
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
    filterText: string,
  |},
|};

function ItemRenderer({
  index,
  style,
  data: { items, getItemProps, highlightedIndex, filterText },
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
        searchText={filterText}
      />
    </SOption>
  );
}

type AddTopicProps = {|
  availableTopicNames: string[],
  displayNameByTopic: { [topicName: string]: string },
  filterText: string,
  onAddTopicItem: ({ [topicName: string]: string }) => void,
  onCloseQuickAdd: () => void,
  onGroupEditClick: (currentFilterText: string) => void,
  setFilterText: (string) => void,
  topicGroup: TopicGroupType,
|};

function AddTopic({
  availableTopicNames,
  displayNameByTopic,
  filterText,
  onAddTopicItem,
  onCloseQuickAdd,
  onGroupEditClick,
  setFilterText,
  topicGroup,
}: AddTopicProps) {
  const filterTextWithoutSpaces = useMemo(() => removeBlankSpaces(filterText), [filterText]);

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
        const isTopicName = getIsTopicName(filterTextWithoutSpaces);
        const filteredItems = getFilteredItems(allItems, filterTextWithoutSpaces);
        const showCreateOption =
          isTopicName &&
          !existingGroupTopicsSet.has(filterTextWithoutSpaces) &&
          !availableTopicNames.includes(filterTextWithoutSpaces);
        const itemsToRender = showCreateOption
          ? [{ topicName: filterTextWithoutSpaces }, ...filteredItems]
          : filteredItems;

        return (
          <SAddContainer>
            <SInputWrapper {...getRootProps({}, { suppressRefError: true })}>
              <Icon small fade>
                <SearchIcon />
              </Icon>
              <SInput
                ref={inputRef}
                data-test="quick-add-topic-input"
                placeholder="Find a topic to add"
                {...getInputProps({
                  onChange: (ev) => {
                    ev.preventDefault();
                    setFilterText(ev.target.value);
                  },
                  value: filterText,
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
                      onAddTopicItem({ topicName: filterTextWithoutSpaces });
                    }
                  },
                })}
              />
              <Icon fade onClick={onCloseQuickAdd} medium>
                <CloseIcon />
              </Icon>
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
                          filterText: filterTextWithoutSpaces,
                        }}>
                        {ItemRenderer}
                      </List>
                    </SOptions>
                  )}
                </AutoSizer>
              )}
            </SOptionsWrapper>
            <SActionWrapper>
              <SBrowseButton onClick={() => onGroupEditClick(filterText)}>
                Edit group
                <Icon small style={{ fontSize: 16, paddingTop: 2 }}>
                  <ChevronRightIcon />
                </Icon>
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
    derivedFields: { addTopicKeyboardFocusIndex, filterText: topLevelFilterText },
  },
  testShowAddView,
}: Props) {
  const [filterText, setFilterText] = useState("");
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
        setShowAddView((shown) => !shown);
        setFocusItemOp(undefined);
      }
    },
    [focusItemOp, highlighted, setFocusItemOp]
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
      filterText={topLevelFilterText}
      onMouseEnter={() => {
        if (!highlighted) {
          setFocusIndex(addTopicKeyboardFocusIndex);
        }
      }}
      showAddView={showAddView}>
      <KeyListener keyDownHandlers={keyDownHandlers} />
      <KeyboardFocusIndex highlighted={highlighted} keyboardFocusIndex={addTopicKeyboardFocusIndex} />
      {!showAddView && (
        <SBrowseButton data-test="show-add-view-btn" onClick={() => setShowAddView(true)}>
          <Icon small>
            <PlusIcon />
          </Icon>
          New topic
        </SBrowseButton>
      )}
      <SShowAddWrapper showAddView={showAddView}>
        {showAddView && (
          <AddTopic
            availableTopicNames={availableTopicNames}
            displayNameByTopic={displayNameByTopic}
            filterText={filterText}
            onAddTopicItem={onAddTopicItem}
            onCloseQuickAdd={onCloseQuickAdd}
            onGroupEditClick={onGroupEditClick}
            setFilterText={setFilterText}
            topicGroup={topicGroup}
          />
        )}
      </SShowAddWrapper>
    </SQuickAddTopic>
  );
}
