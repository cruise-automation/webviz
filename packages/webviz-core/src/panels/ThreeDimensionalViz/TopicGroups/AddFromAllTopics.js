// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import SearchIcon from "@mdi/svg/svg/magnify.svg";
import { Checkbox } from "antd";
import Downshift from "downshift";
import fuzzySort from "fuzzysort";
import { uniq, partition } from "lodash";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import { useDebounce } from "use-debounce";

import { DEFAULT_DEBOUNCE_TIME } from "./constants";
import { getIsTopicName, SOption, SInput, SInputWrapper } from "./QuickAddTopic";
import { removeBlankSpaces } from "./topicGroupsUtils";
import TopicNameDisplay from "./TopicNameDisplay";
import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import { useChangeDetector } from "webviz-core/src/util/hooks";
import naturalSort from "webviz-core/src/util/naturalSort";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const SAddContainer = styled.div`
  border-radius: 4px;
  width: 100%;
  background: ${colors.DARK1};
  min-height: 360px;
  height: 100%;
  position: relative;
`;

export const SOptionsWrapper = styled.div`
  position: relative;
  height: calc(100% - 80px);
`;

export const SOptions = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: auto;
`;

export const SActionWrapper = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  text-align: right;
  align-items: center;
  padding: 8px;
  background: ${colors.DARK2};
`;

type FilterItem = {|
  topicName: string,
  displayName?: string,
  filterKey: string,
  filePrepared?: boolean,
|};

type GetItemProp = {| key: string, index: number, item: FilterItem, style: { [attr: string]: string | number } |};
type ItemRendererProps = {|
  isScrolling: ?boolean,
  index: number,
  style: { [attr: string]: string | number },
  data: {|
    checkedTopicNamesSet: Set<string>,
    existingGroupTopicsSet: Set<string>,
    getItemProps: (GetItemProp) => GetItemProp,
    highlightedIndex: number,
    items: FilterItem[],
    onCheckChange: (item: FilterItem, showCreateOption: boolean) => void,
    searchText: string,
    showCreateOption: boolean,
  |},
|};

function ItemRenderer({
  index,
  style,
  data: {
    checkedTopicNamesSet,
    existingGroupTopicsSet,
    getItemProps,
    highlightedIndex,
    items,
    onCheckChange,
    showCreateOption,
    searchText,
  },
}: ItemRendererProps) {
  const item = items[index];
  const isCheckedFromTopicGroup = existingGroupTopicsSet.has(item.topicName);
  const checked = checkedTopicNamesSet.has(item.topicName);
  return (
    <SOption
      display="flex"
      data-test={`option-${item.topicName}`}
      fade={isCheckedFromTopicGroup}
      highlighted={highlightedIndex === index}
      {...getItemProps({ key: item.topicName, index, item, style })}>
      <Checkbox checked={checked} onChange={() => onCheckChange(item, showCreateOption)}>
        <TopicNameDisplay
          displayName={item.displayName || item.topicName}
          topicName={item.topicName}
          searchText={searchText}
        />
      </Checkbox>
    </SOption>
  );
}

type Props = {|
  availableTopicNames: string[],
  defaultFilterText?: ?string,
  displayNameByTopic: { [topicName: string]: string },
  existingGroupTopicsSet: Set<string>,
  onCloseModal: () => void,
  onSave: (string[]) => void,
|};

export default function AddFromAllTopics({
  availableTopicNames,
  defaultFilterText,
  displayNameByTopic,
  existingGroupTopicsSet,
  onCloseModal,
  onSave,
}: Props) {
  const [filterText, setFilterText] = useState<string>(defaultFilterText || "");
  const filterTextWithoutSpaces = useMemo(() => removeBlankSpaces(filterText), [filterText]);
  const [debouncedFilterText] = useDebounce(filterTextWithoutSpaces, DEFAULT_DEBOUNCE_TIME);
  const onlySearchOnTopicNames = !!(debouncedFilterText && debouncedFilterText.startsWith("/"));

  const [checkedTopicNamesSet, setCheckedTopicNamesSet] = useState<Set<string>>(
    () => new Set([...existingGroupTopicsSet])
  );
  const availableTopicNamesSet = useMemo(() => new Set(availableTopicNames), [availableTopicNames]);
  const [newlyAddedTopicNamesSet, setNewlyAddedTopicNamesSet] = useState<Set<string>>(() => new Set());
  const [filteredKeysSet, setFilteredKeysSet] = useState<Set<string>>(() => new Set());

  const inputRef = useRef<?HTMLInputElement>(undefined);
  useEffect(() => {
    // auto focus on input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const allItems: FilterItem[] = useMemo(
    () =>
      uniq([...availableTopicNamesSet, ...existingGroupTopicsSet, ...newlyAddedTopicNamesSet])
        .sort(naturalSort())
        .map((topicName) => ({
          topicName,
          ...(displayNameByTopic[topicName] ? { displayName: displayNameByTopic[topicName] } : undefined),
        }))
        .map((item) => ({ ...item, filterKey: `${item.topicName} ${item.displayName || ""}` })),
    [availableTopicNamesSet, displayNameByTopic, existingGroupTopicsSet, newlyAddedTopicNamesSet]
  );

  // Use filePreparedRef to indicate whether we need to update filePrepared which can happen when topics become
  // available or the user manually entered a new topic.
  const filePreparedRef = useRef(false);
  const hasItemsInputChanged = useChangeDetector(
    [availableTopicNamesSet, displayNameByTopic, existingGroupTopicsSet, newlyAddedTopicNamesSet],
    false
  );
  // Rerun filePrepared whenever allItems dependencies have changed.
  if (hasItemsInputChanged) {
    filePreparedRef.current = false;
  }

  useEffect(
    () => {
      // Update the filteredKeys based on debouncedFilterText. Debounce it since as the user might type very fast.
      if (debouncedFilterText) {
        if (!filePreparedRef.current) {
          // Modify the items to add filePrepared field in order to speed up filtering.
          allItems.forEach((item) => (item.filePrepared = item.filePrepared || fuzzySort.prepare(item.filterKey)));
          filePreparedRef.current = true;
        }
        const newFilteredKeys: string[] = fuzzySort
          .go(debouncedFilterText, allItems, {
            allowTypo: false,
            keys: onlySearchOnTopicNames ? ["topicName"] : ["filterKey"],
            limit: 50,
            threshold: -10000,
          })
          .map((res: { obj: FilterItem }) => res.obj.filterKey);
        setFilteredKeysSet(new Set(newFilteredKeys));
      } else {
        setFilteredKeysSet(new Set());
      }
    },
    [allItems, debouncedFilterText, onlySearchOnTopicNames]
  );

  // Track previous highlighted index so the highlighting won't get lost after re-rendering caused by the checkbox selection.
  const defaultHighlightedIndexRef = useRef<?number>(undefined);

  const onCheckChange = useCallback(
    (selectedItem, showCreateOption) => {
      const checked = checkedTopicNamesSet.has(selectedItem.topicName);
      const newCheckedTopicNamesSet = new Set([...checkedTopicNamesSet]);
      if (checked) {
        newCheckedTopicNamesSet.delete(selectedItem.topicName);
      } else {
        newCheckedTopicNamesSet.add(selectedItem.topicName);
      }
      if (showCreateOption && selectedItem.topicName === debouncedFilterText) {
        setNewlyAddedTopicNamesSet(new Set([...newCheckedTopicNamesSet, selectedItem.topicName]));
      }
      setCheckedTopicNamesSet(newCheckedTopicNamesSet);
    },
    [checkedTopicNamesSet, debouncedFilterText]
  );

  return (
    <Downshift
      defaultHighlightedIndex={defaultHighlightedIndexRef.current}
      itemToString={(item) => (item ? item.topicName : "")}>
      {({ getInputProps, getItemProps, getMenuProps, getRootProps, highlightedIndex }) => {
        let itemsToRender = debouncedFilterText
          ? allItems.filter((item) => filteredKeysSet.has(item.filterKey))
          : allItems;

        const isTopicName = getIsTopicName(debouncedFilterText);

        const showCreateOption =
          isTopicName &&
          !existingGroupTopicsSet.has(debouncedFilterText) &&
          !availableTopicNamesSet.has(debouncedFilterText) &&
          !newlyAddedTopicNamesSet.has(debouncedFilterText);
        defaultHighlightedIndexRef.current = highlightedIndex;
        const [topicGroupCheckedItems, otherItems] = partition(itemsToRender, (item) =>
          existingGroupTopicsSet.has(item.topicName)
        );
        itemsToRender = [...otherItems, ...topicGroupCheckedItems];
        itemsToRender = showCreateOption ? [{ topicName: debouncedFilterText }, ...itemsToRender] : itemsToRender;

        return (
          <SAddContainer>
            <SInputWrapper style={{ paddingLeft: 16 }} {...getRootProps({}, { suppressRefError: true })}>
              <Icon small fade>
                <SearchIcon />
              </Icon>
              <SInput
                ref={inputRef}
                data-test="all-topics-input"
                placeholder="Find topics to add"
                {...getInputProps({
                  value: filterText,
                  onChange: (event) => setFilterText(event.target.value),
                  onKeyDown: (event) => {
                    if (event.ctrlKey && highlightedIndex != null) {
                      // Select the item directly when pressed ctrlKey.
                      const highlightedItem = itemsToRender[highlightedIndex];
                      onCheckChange(highlightedItem, showCreateOption);
                    } else if (event.key === "Enter" && showCreateOption && highlightedIndex == null) {
                      // Create a new item when pressed enter without selecting any items.
                      event.preventDownshiftDefault = true;
                      setCheckedTopicNamesSet(new Set([...checkedTopicNamesSet, debouncedFilterText]));
                      checkedTopicNamesSet.add(debouncedFilterText);
                      setNewlyAddedTopicNamesSet(new Set([...newlyAddedTopicNamesSet, debouncedFilterText]));
                    }
                  },
                })}
              />
            </SInputWrapper>
            <SOptionsWrapper>
              {itemsToRender.length === 0 ? (
                <p style={{ padding: 8 }}>No topics found to add.</p>
              ) : (
                <AutoSizer>
                  {({ height, width }) => (
                    <SOptions {...getMenuProps()}>
                      <List
                        width={width}
                        height={height}
                        itemCount={itemsToRender.length}
                        itemSize={44}
                        itemData={{
                          checkedTopicNamesSet,
                          existingGroupTopicsSet,
                          getItemProps,
                          highlightedIndex,
                          items: itemsToRender,
                          onCheckChange,
                          searchText: debouncedFilterText,
                          showCreateOption,
                        }}>
                        {ItemRenderer}
                      </List>
                    </SOptions>
                  )}
                </AutoSizer>
              )}
            </SOptionsWrapper>
            <SActionWrapper>
              <Button style={{ marginRight: 8 }} onClick={onCloseModal}>
                Cancel
              </Button>
              <Button
                isPrimary
                className="test-all-topics-save-button"
                onClick={() => {
                  onSave([...checkedTopicNamesSet]);
                  onCloseModal();
                }}>
                Save ({checkedTopicNamesSet.size} {checkedTopicNamesSet.size > 1 ? "topics" : "topic"})
              </Button>
            </SActionWrapper>
          </SAddContainer>
        );
      }}
    </Downshift>
  );
}
