// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import SearchIcon from "@mdi/svg/svg/magnify.svg";
import fuzzySort from "fuzzysort";
import { omit, set, cloneDeep, compact } from "lodash";
import memoizeOne from "memoize-one";
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import styled from "styled-components";
import { useDebounce, useDebouncedCallback } from "use-debounce";

import { type Save3DConfig } from "../index";
import AdditionalSearchResults from "./AdditionalSearchResults";
import { DEFAULT_DEBOUNCE_TIME, FOCUS_ITEM_OPS } from "./constants";
import CreateGroupButton from "./CreateGroupButton";
import { SInput } from "./QuickAddTopic";
import TopicGroupList from "./TopicGroupList";
import TopicGroupsMenu from "./TopicGroupsMenu";
import { getOnTopicGroupsChangeDataByKeyboardOp } from "./topicGroupsOnChangeUtils";
import {
  addIsKeyboardFocusedToTopicGroups,
  buildAvailableNamespacesByTopic,
  buildItemDisplayNameByTopicOrExtension,
  getSceneErrorsByTopic,
  getTopicGroups,
  removeTopicPrefixes,
  updateFocusIndexesAndGetFocusData,
  removeBlankSpaces,
  FEATURE_DATA_SOURCE_PREFIXES,
  TOPIC_CONFIG,
  ALL_DATA_SOURCE_PREFIXES,
} from "./topicGroupsUtils";
import TopIcons from "./TopIcons";
import type { FocusItemOp, TopicGroupConfig, TopicGroupType, TopicGroupsSearchResult } from "./types";
import Confirm from "webviz-core/src/components/Confirm";
import Icon from "webviz-core/src/components/Icon";
import KeyboardShortcut from "webviz-core/src/components/KeyboardShortcut";
import KeyListener from "webviz-core/src/components/KeyListener";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import { type Topic } from "webviz-core/src/players/types";
import { useDeepChangeDetector } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export type KeyboardContextType = {|
  // An index number to map the keyboard operations (up/down arrow) to a topic/group/newTopic/newGroup item
  focusIndex: number,
  // Operations the user can perform by keyboard when focused on an item, supporting "Enter", "ArrowLeft", "ArrowRight", "Backspace".
  focusItemOp: ?FocusItemOp,
  onFocusOnContainer: () => void,
  setFocusIndex: (newFocusIndex: number) => void,
  setFocusItemOp: (?FocusItemOp) => void,
|};

export const KeyboardContext = React.createContext<KeyboardContextType>({
  focusIndex: -1,
  focusItemOp: undefined,
  onFocusOnContainer: () => {},
  setFocusIndex: () => {},
  setFocusItemOp: () => {},
});

const CONTAINER_SPACING = 15;
const TOPIC_GROUPS_HEADER_HEIGHT = 40;
// 24 is the top icon height, multiply CONTAINER_SPACING by 3 instead of 2 to give a little extra space at the bottom.
const TOPIC_GROUP_MAIN_TOP_SPACING = CONTAINER_SPACING * 3 + 24 + TOPIC_GROUPS_HEADER_HEIGHT;

const STopicGroupsContainer = styled.div`
  position: absolute;
  top: ${CONTAINER_SPACING}px;
  left: ${CONTAINER_SPACING}px;
  z-index: 102;
`;

const SFocusContainer = styled.div`
  &:focus {
    outline: none;
  }
`;

const STopicGroups = styled.div`
  position: relative;
  color: ${colors.TEXTL1};
  border-radius: 6px;
  background-color: ${colors.TOOLBAR};
  max-width: 440px;
  padding-bottom: 6px;
`;

const STopicGroupsHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  padding-left: 8px;
  align-items: center;
  background-color: ${colors.DARK5};
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
`;

const SFilter = styled.div`
  display: flex;
  padding: 8px 8px 8px 4px;
  align-items: center;
  flex: 1;
`;

type SharedProps = {|
  availableTopics: Topic[],
  containerHeight: number,
  onExitTopicGroupFocus: () => void,
  onMigrateToTopicGroupConfig: () => void,
  pinTopics: boolean,
  saveConfig: Save3DConfig,
  setShowTopicGroups: (boolean | ((boolean) => boolean)) => void,
  showTopicGroups: boolean,
  topicGroupsConfig: TopicGroupConfig[],
|};
type TopicGroupsBaseProps = {|
  ...SharedProps,
  dataTestShowErrors?: boolean,
  displayNameByTopic: { [topicName: string]: string },
  errorsByTopic: { [topicName: string]: string[] },
  namespacesByTopic: { [topicName: string]: string[] },
  sceneCollectorMsgForTopicSetting: any,
  setSettingsTopicName: (topicName: ?string) => void,
|};

export function getFilteredKeys(
  topicGroupsConfig: TopicGroupConfig[],
  displayNameByTopic: { [topicName: string]: string },
  filterText: string,
  namespacesByTopic: { [topicName: string]: string[] }
): string[] {
  // Build a list of filtered keys for fuzzy filtering on group displayName, topic displayName and topicName.
  const allFilterKeysSet = new Set(); // no need to have duplicated filter keys
  const onlySearchOnTopics = filterText.startsWith("/");
  topicGroupsConfig.forEach((groupConfig) => {
    allFilterKeysSet.add(groupConfig.displayName);
    groupConfig.items.forEach(({ topicName, displayName }) => {
      // Search by topicName.
      allFilterKeysSet.add(topicName);
      if (onlySearchOnTopics) {
        return;
      }
      // Search by namespace.
      ALL_DATA_SOURCE_PREFIXES.forEach((prefix) => {
        const prefixedTopicName = `${prefix}${topicName}`;
        if (namespacesByTopic[prefixedTopicName]) {
          namespacesByTopic[prefixedTopicName].forEach((ns) => {
            allFilterKeysSet.add(ns);
          });
        }
      });
      // Search by displayName.
      if (displayName) {
        allFilterKeysSet.add(displayName);
      } else if (displayNameByTopic[topicName]) {
        allFilterKeysSet.add(displayNameByTopic[topicName]);
      }
    });
  });

  return fuzzySort.go(filterText, [...allFilterKeysSet], { limit: 100 }).map((res: { target: string }) => res.target);
}

// The availableTopics, displayNames, and namespaces don't change very often - once when we load a bag, or when the user
// edits a displayName. Precalculate them for faster performance.
type SearchTopic = {|
  topic: Topic,
  // These are fuzzySort primitives that improve the speed of the search.
  preparedTopicName: mixed,
  preparedDisplayName: mixed,
  preparedJoinedNamespaces: mixed,
  preparedNamespaces: mixed[],
|};
const getMemoizedSearchTopics = memoizeOne(
  (
    availableTopics: Topic[],
    displayNameByTopic: { [topicName: string]: string },
    namespacesByTopic: { [topicName: string]: string[] }
  ): SearchTopic[] => {
    const topicsToSearch = availableTopics.map((topic) => {
      const { name } = topic;
      return {
        topic,
        preparedTopicName: fuzzySort.prepare(name),
        preparedDisplayName: fuzzySort.prepare(displayNameByTopic[name] || ""),
        preparedJoinedNamespaces: fuzzySort.prepare((namespacesByTopic[name] || []).join(" ")),
        preparedNamespaces: (namespacesByTopic[name] || []).map((namespace) => fuzzySort.prepare(namespace)),
      };
    });
    return topicsToSearch;
  }
);

const DEFAULT_RESULT_LIMIT = 3;
const EXPANDED_RESULT_LIMIT = 100;
export function getTopFilteredAvailableTopics(
  availableTopics: Topic[],
  displayNameByTopic: { [topicName: string]: string },
  namespacesByTopic: { [topicName: string]: string[] },
  filterText: string,
  areSearchResultsExpanded: boolean
): TopicGroupsSearchResult[] {
  const searchTopics = getMemoizedSearchTopics(availableTopics, displayNameByTopic, namespacesByTopic);
  const searchMatches = fuzzySort
    // Increase the result limit in case we get matches for topic name and display name, or different namespaces, of the
    // same topic.
    .go(filterText, searchTopics, {
      limit: areSearchResultsExpanded ? EXPANDED_RESULT_LIMIT : DEFAULT_RESULT_LIMIT,
      keys: ["preparedTopicName", "preparedDisplayName", "preparedJoinedNamespaces"],
      scoreFn: ([topicNameResult, displayNameResult, namespaceResult]) => {
        // This is our custom score function for ordering search results. We take the max score of topic name, display
        // name, or namespace scores. These numbers are chosen somewhat arbitrarily and can be tweaked to adjust search
        // results.
        // See https://github.com/farzher/fuzzysort/tree/c6604993ac51bfe4de8e82c0a4d9b0c6e1794682#advanced-usage
        const topicNameScore = topicNameResult ? topicNameResult.score : -Infinity;
        const displayNameScore = displayNameResult ? displayNameResult.score - 1000 : -Infinity;
        const namespaceScore = namespaceResult ? namespaceResult.score - 2000 : -Infinity;
        return Math.max(topicNameScore, displayNameScore, namespaceScore);
      },
    })
    .map((res: { obj: SearchTopic }) => res.obj);

  return searchMatches.map(({ topic, preparedNamespaces }) => {
    // We search namespaces separately so that we can display only the namespaces that match the target.
    const namespaces: string[] = fuzzySort.go(filterText, preparedNamespaces).map(({ target }) => target);
    return {
      topic,
      namespaces,
    };
  });
}

export function TopicGroupsBase({
  availableTopics = [],
  containerHeight,
  dataTestShowErrors,
  displayNameByTopic = {},
  errorsByTopic,
  namespacesByTopic = {},
  onExitTopicGroupFocus,
  onMigrateToTopicGroupConfig,
  pinTopics,
  saveConfig,
  sceneCollectorMsgForTopicSetting,
  setSettingsTopicName,
  setShowTopicGroups,
  showTopicGroups,
  topicGroupsConfig,
}: TopicGroupsBaseProps) {
  const renderTopicGroups = pinTopics || showTopicGroups;

  const inputRef = useRef<?HTMLInputElement>();
  const containerRef = useRef<?HTMLDivElement>();
  // Use focusIndex to control which group/topic/action row to focus on during keyboard nav.
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  // For keyboard ops that need to be handled by UI (New topic / New Group), the focusItemOp will be passed down to
  // the specific component to perform the UI changes, and the component will clear focusItemOp upon completing the UI changes.
  const [focusItemOp, setFocusItemOp] = useState<?FocusItemOp>();

  // Reset the focusIndex when close TopicGroups.
  useEffect(
    () => {
      if (!showTopicGroups) {
        setFocusIndex(-1);
      }
    },
    [showTopicGroups]
  );

  // use callbackRefs to prevent unnecessary callback changes.
  const callbackRefs = useRef({ focusIndex });
  callbackRefs.current = { focusIndex };

  const onFocusOnContainer = useCallback(() => {
    // Focus on the container if it's not already focused.
    if (containerRef.current && document.activeElement !== containerRef.current) {
      containerRef.current.focus();
    }
    // Always focus on the first item when bringing the focus to the container.
    if (callbackRefs.current.focusIndex === -1) {
      setFocusIndex(0);
    }
  }, []);

  // Pass keyboard nav info down by context to avoid too many props.
  const keyboardContextValue = useMemo(
    () => ({ focusIndex, setFocusIndex, focusItemOp, setFocusItemOp, onFocusOnContainer }),
    [focusIndex, focusItemOp, onFocusOnContainer]
  );

  // Focus on the container immediately when the opening TopicGroups.
  useEffect(
    () => {
      if (renderTopicGroups) {
        onFocusOnContainer();
      }
    },
    [onFocusOnContainer, renderTopicGroups]
  );

  const [filterText, setFilterText] = useState<string>("");
  const [filteredKeysSet, setFilteredKeysSet] = useState<?Set<string>>();
  const [filteredSearchResults, setFilteredSearchResults] = useState<?(TopicGroupsSearchResult[])>();
  const [areSearchResultsExpanded, setAreSearchResultsExpanded] = useState<boolean>(false);

  const filterTextWithoutSpaces = useMemo(() => removeBlankSpaces(filterText), [filterText]);
  const [debouncedFilterText] = useDebounce(filterTextWithoutSpaces, DEFAULT_DEBOUNCE_TIME);

  useEffect(
    () => {
      // Update the filteredKeys based on filterText. Debounce it since the user might type very fast.
      if (debouncedFilterText) {
        setFilteredKeysSet(
          new Set(getFilteredKeys(topicGroupsConfig, displayNameByTopic, debouncedFilterText, namespacesByTopic))
        );
        setFilteredSearchResults(
          getTopFilteredAvailableTopics(
            availableTopics,
            displayNameByTopic,
            namespacesByTopic,
            debouncedFilterText,
            areSearchResultsExpanded
          )
        );
      } else {
        setFilteredKeysSet(undefined);
        setFilteredSearchResults(undefined);
        // Reset the search results to no longer be expanded when the user deletes all search input.
        setAreSearchResultsExpanded(false);
      }
    },
    [
      availableTopics,
      debouncedFilterText,
      displayNameByTopic,
      namespacesByTopic,
      topicGroupsConfig,
      areSearchResultsExpanded,
    ]
  );

  const nonPrefixedAvailableTopicNames = useMemo(
    () => removeTopicPrefixes(availableTopics.map((topic) => topic.name)),
    [availableTopics]
  );

  const hasFeatureColumn = useMemo(
    () => availableTopics.some((topic) => FEATURE_DATA_SOURCE_PREFIXES.some((prefix) => topic.name.startsWith(prefix))),
    [availableTopics]
  );

  const topicGroupsWithoutFocusInfo = getTopicGroups(topicGroupsConfig, {
    displayNameByTopic,
    namespacesByTopic,
    availableTopics,
    errorsByTopic,
    filterText: debouncedFilterText,
    filteredKeysSet,
    hasFeatureColumn,
  });

  // Update the topicGroups and assign focusIndexes according to the final visibility/expanded states, and collect `focusData`
  // which is an array that can map indexes (focusIndex) to
  //  - objectPath: for getting the group/topic data once the user triggered a keyboard op
  //  - focusType: including GROUP, NEW_GROUP, TOPIC, NEW_TOPIC, NAMESPACE, which tells what kind of data and field we need to get to perform the op
  const { topicGroups: topicGroupsWithUpdatedFocusIndex, focusData } = useMemo(
    () => updateFocusIndexesAndGetFocusData(topicGroupsWithoutFocusInfo),
    [topicGroupsWithoutFocusInfo]
  );
  const topicGroups = useMemo(
    () =>
      // No need to add isKeyboardFocused field if not focusing on any row.
      focusIndex === -1
        ? topicGroupsWithUpdatedFocusIndex
        : addIsKeyboardFocusedToTopicGroups(topicGroupsWithUpdatedFocusIndex, focusIndex),
    [focusIndex, topicGroupsWithUpdatedFocusIndex]
  );

  const scrollContainerRef = useRef<?HTMLDivElement>();
  const scrollFocusedItemIntoView = useCallback(
    () => {
      const scrollContainerElem = scrollContainerRef.current;
      if (focusIndex === -1 || focusData.length < 2 || !containerRef.current || !scrollContainerElem) {
        return;
      }
      // Query byClassName on the current container since there might be multiple TopicGroups in different 3D panels.
      const focusElems = containerRef.current.getElementsByClassName(`focus-item-${focusIndex}`);
      if (focusElems.length > 0) {
        scrollIntoView(focusElems[0], {
          behavior: "smooth",
          block: "center",
          boundary: scrollContainerElem,
          scrollMode: "if-needed",
        });
      }
    },
    [focusData.length, focusIndex]
  );

  const saveNewTopicGroupsToConfig = useCallback(
    (newTopicGroups: TopicGroupType[]) => {
      const newTopicGroupsConfig = compact(newTopicGroups).map((group) => ({
        ...omit(group, "derivedFields"),
        items: compact(group.items).map((item) => omit(item, "derivedFields")),
      }));
      saveConfig({ topicGroups: newTopicGroupsConfig });
    },
    [saveConfig]
  );

  const onTopicGroupsChange = useCallback(
    (objectPath: string, newValue: any) => {
      // The full topicGroups array have been updated, e.g. reordering
      if (objectPath === "") {
        saveNewTopicGroupsToConfig(newValue);
        return;
      }
      // Make a deep copy of topicGroups to avoid mutation bugs.
      const newTopicGroups = cloneDeep(topicGroups);
      set(newTopicGroups, objectPath, newValue);
      saveNewTopicGroupsToConfig(newTopicGroups);
    },
    [saveNewTopicGroupsToConfig, topicGroups]
  );

  const onAddGroup = useCallback(
    (newTopicGroupConfig: TopicGroupConfig) => saveConfig({ topicGroups: [...topicGroupsConfig, newTopicGroupConfig] }),
    [saveConfig, topicGroupsConfig]
  );

  const [debouncedSharedOnKeyHandler] = useDebouncedCallback(
    (focusItemOpAlt: FocusItemOp, isShiftKeyPressed?: boolean) => {
      // Don't support item expand/collapse when filtering since we auto expand all.
      if (
        debouncedFilterText &&
        (focusItemOpAlt === FOCUS_ITEM_OPS.ArrowLeft || focusItemOpAlt === FOCUS_ITEM_OPS.ArrowRight)
      ) {
        return;
      }
      const onTopicGroupsChangeData = getOnTopicGroupsChangeDataByKeyboardOp({
        focusItemOp: focusItemOpAlt,
        focusData,
        topicGroups,
        focusIndex,
        isShiftKeyPressed,
      });
      if (focusItemOpAlt === FOCUS_ITEM_OPS.ArrowUp) {
        setFocusIndex(focusIndex - 1 >= -1 ? focusIndex - 1 : focusData.length - 1);
        scrollFocusedItemIntoView();
        return;
      }
      if (focusItemOpAlt === FOCUS_ITEM_OPS.ArrowDown) {
        setFocusIndex(focusIndex + 1 >= focusData.length ? -1 : focusIndex + 1);
        scrollFocusedItemIntoView();
        return;
      }

      if (!onTopicGroupsChangeData) {
        return;
      }
      const { objectPath, focusType, newValue, unhandledFocusItemOp } = onTopicGroupsChangeData;
      if (objectPath && !unhandledFocusItemOp) {
        // Trigger topicGroups change directly for visibility toggle and expand/collapse
        onTopicGroupsChange(objectPath, newValue);
      } else if (unhandledFocusItemOp) {
        if (unhandledFocusItemOp === FOCUS_ITEM_OPS.Backspace) {
          // Use Shift to perform operation without Confirmation
          if (!isShiftKeyPressed) {
            // Confirm with the user before deleting the group/topic.
            const confirmProps =
              focusType === "GROUP"
                ? {
                    prompt: "Are you sure you want to delete the group?",
                    confirmStyle: "danger",
                    ok: "Delete group",
                    cancel: "Cancel",
                  }
                : {
                    prompt: "Are you sure you want to delete the topic?",
                    confirmStyle: "danger",
                    ok: "Delete topic",
                    cancel: "Cancel",
                  };
            Confirm(confirmProps).then((confirmed) => {
              // TODO(Audrey): add keyboard support for Confirm modal
              if (confirmed) {
                onTopicGroupsChange(objectPath, newValue);
              }
            });
          } else {
            onTopicGroupsChange(objectPath, newValue);
          }
        } else {
          // Use UI to handle the rest of keyboard ops, e.g. pressed Enter on New topic / New Group
          setFocusItemOp(unhandledFocusItemOp);
        }
      }
    },
    DEFAULT_DEBOUNCE_TIME
  );

  // TODO(Audrey): add support for moving up and down
  // Shared handlers between filter and non-filter mode.
  const sharedHandlers = useMemo(
    () => {
      return {
        ArrowDown: () => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.ArrowDown),
        ArrowUp: () => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.ArrowUp),
        ArrowLeft: () => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.ArrowLeft),
        ArrowRight: () => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.ArrowRight),
        Enter: (e) => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.Enter, e.shiftKey),
        Tab: () => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.Enter),
      };
    },
    [debouncedSharedOnKeyHandler]
  );

  const keyDownHandlers = useMemo(
    () => {
      let handlers = {
        t: (e) => {
          e.preventDefault();
          // Unpin before enabling keyboard toggle open/close.
          if (pinTopics) {
            saveConfig({ pinTopics: false });
            return;
          }
          setShowTopicGroups(!showTopicGroups);
        },
        Backspace: (e) => {
          e.preventDefault();
          debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.Backspace, e.shiftKey);
        },
        Escape: (e) => {
          const activeEl = document.activeElement;
          const containerEl = containerRef.current;
          if (!activeEl || !containerEl) {
            return;
          }
          if (activeEl === containerEl) {
            e.preventDefault();
            // Hide TopicGroups if the already open.
            if (showTopicGroups) {
              setShowTopicGroups(false);
            } else {
              // Exit TopicGroups focus if it's closed.
              onExitTopicGroupFocus();
            }
          } else if (containerEl.contains(activeEl)) {
            // Otherwise, get out of any other TopicGroups focus elements, and simply focus on the TopicGroups container.
            e.preventDefault();
            onFocusOnContainer();
          }
        },
      };
      if (renderTopicGroups) {
        handlers = {
          ...handlers,
          ...sharedHandlers,
          // Add slash hotkey to explicitly focus on input since we want to support keyboard nav in non-filter mode.
          "/": (e) => {
            e.preventDefault();
            if (inputRef.current) {
              inputRef.current.focus();
            }
          },
        };
      }
      return handlers;
    },
    [
      debouncedSharedOnKeyHandler,
      onExitTopicGroupFocus,
      onFocusOnContainer,
      pinTopics,
      renderTopicGroups,
      saveConfig,
      setShowTopicGroups,
      sharedHandlers,
      showTopicGroups,
    ]
  );

  return (
    <STopicGroupsContainer style={{ maxHeight: containerHeight - 30 }}>
      <SFocusContainer
        style={{ maxHeight: containerHeight - 30 }}
        onMouseEnter={() => {
          // Focus on the container in order to enable keyboard navigation.
          onFocusOnContainer();
        }}
        onMouseLeave={() => {
          setFocusIndex(-1);
        }}
        onClick={(e) => e.stopPropagation()}
        data-test={"topic-groups-focus-container"}
        aria-activedescendant={focusIndex === -1 ? "" : `focus-item-${focusIndex}`}
        aria-expanded={topicGroups.length > 0}
        aria-haspopup="listbox"
        aria-owns="topic-group-listbox"
        ref={containerRef}
        role="combobox"
        tabIndex={0}>
        <KeyListener keyDownHandlers={keyDownHandlers} />
        <KeyboardContext.Provider value={keyboardContextValue}>
          <TopIcons
            pinTopics={pinTopics}
            renderTopicGroups={renderTopicGroups}
            saveConfig={saveConfig}
            setShowTopicGroups={setShowTopicGroups}
          />
          {renderTopicGroups && (
            <STopicGroups>
              <STopicGroupsHeader>
                <SFilter>
                  <Icon small fade tooltipProps={{ placement: "bottom", contents: <KeyboardShortcut keys={["/"]} /> }}>
                    <SearchIcon />
                  </Icon>
                  <SInput
                    aria-autocomplete="list"
                    aria-controls="topic-group-listbox"
                    data-test="filter-input"
                    defaultValue={filterText}
                    placeholder="Filter topics"
                    ref={inputRef}
                    onKeyDown={(e) => {
                      const handler = sharedHandlers[e.key];
                      if (handler) {
                        // Allow arrows to go left/right when the focusIndex is not yet set
                        if (!((focusIndex === -1 && e.key === "ArrowLeft") || e.key === "ArrowRight")) {
                          e.preventDefault();
                        }
                        handler(e);
                      }
                    }}
                    onKeyUp={(e) => {
                      if (sharedHandlers[e.key]) {
                        e.preventDefault();
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        onFocusOnContainer();
                        return;
                      }
                      // Reset focusIndex when it goes out of range.
                      // Note we could reset whenever the input changes, but it's nice to have it stay around the range that the user previously
                      // navigated to. The tradeoff is the user can not use the `delete` key to delete the items when input is focused,
                      // because if we enable that, the user won't be able to delete the input characters.
                      if (focusIndex >= focusData.length - 1) {
                        setFocusIndex(-1);
                      }
                      // Only set filterText onKeyUp after the input value is set.
                      setFilterText(e.target.value);
                    }}
                  />
                </SFilter>
                <TopicGroupsMenu saveConfig={saveConfig} onImportSettings={onMigrateToTopicGroupConfig} />
              </STopicGroupsHeader>
              <div
                ref={scrollContainerRef}
                style={{ maxHeight: containerHeight - TOPIC_GROUP_MAIN_TOP_SPACING - 6, overflow: "auto" }}>
                <TopicGroupList
                  topicGroups={topicGroups}
                  availableTopicNames={nonPrefixedAvailableTopicNames}
                  dataTestShowErrors={!!dataTestShowErrors}
                  displayNameByTopic={displayNameByTopic}
                  onTopicGroupsChange={onTopicGroupsChange}
                  onAddGroup={onAddGroup}
                  sceneCollectorMsgForTopicSetting={sceneCollectorMsgForTopicSetting}
                  setSettingsTopicName={setSettingsTopicName}
                />
                {topicGroups.length > 0 && (
                  <CreateGroupButton
                    availableTopicNames={nonPrefixedAvailableTopicNames}
                    displayNameByTopic={displayNameByTopic}
                    keyboardFocusIndex={focusData.length - 1}
                    onAddGroup={onAddGroup}
                  />
                )}
                {filteredSearchResults && filteredSearchResults.length > 0 && (
                  <AdditionalSearchResults
                    searchText={debouncedFilterText}
                    filteredSearchResults={filteredSearchResults}
                    displayNameByTopic={displayNameByTopic}
                    namespacesByTopic={namespacesByTopic}
                    onTopicGroupsChange={onTopicGroupsChange}
                    topicGroups={topicGroups}
                    onAddGroup={onAddGroup}
                    areSearchResultsExpanded={areSearchResultsExpanded}
                    setAreSearchResultsExpanded={setAreSearchResultsExpanded}
                  />
                )}
              </div>
            </STopicGroups>
          )}
        </KeyboardContext.Provider>
      </SFocusContainer>
    </STopicGroupsContainer>
  );
}

type SceneData = {|
  sceneCollectorMsgForTopicSetting: any,
  sceneErrorsByTopic: { [topicName: string]: string[] },
  sceneNamespacesByTopic: { [topicName: string]: string[] },
|};

type TopicGroupsProps = {|
  ...SharedProps,
  availableTfs: string[],
  enableShortDisplayNames: boolean,
  sceneBuilder: SceneBuilder,
|};

type UnMemoizedTopicGroupsProps = {|
  ...SharedProps,
  ...SceneData,
  enableShortDisplayNames: boolean,
  availableTfs: string[],
  sceneCollectorMsgForTopicSetting: any,
  setSettingsTopicName: (topicName: ?string) => void,
  setShowTopicGroups: (boolean | ((boolean) => boolean)) => void,
  showTopicGroups: boolean,
|};
// Use the wrapper component to handle displayName, namespace and topic processing.
function UnMemoizedTopicGroups({
  availableTfs,
  availableTopics,
  enableShortDisplayNames,
  sceneCollectorMsgForTopicSetting,
  sceneErrorsByTopic,
  sceneNamespacesByTopic,
  ...rest
}: UnMemoizedTopicGroupsProps) {
  const { configDisplayNameByTopic, configNamespacesByTopic } = useMemo(
    () => {
      return {
        configDisplayNameByTopic: buildItemDisplayNameByTopicOrExtension(TOPIC_CONFIG, enableShortDisplayNames),
        configNamespacesByTopic: buildAvailableNamespacesByTopic(TOPIC_CONFIG),
      };
    },
    [enableShortDisplayNames]
  );

  const namespacesByTopic = useMemo(
    () => {
      return {
        ...sceneNamespacesByTopic,
        ...configNamespacesByTopic,
        ...(availableTfs.length ? { "/tf": availableTfs } : undefined),
      };
    },
    [sceneNamespacesByTopic, configNamespacesByTopic, availableTfs]
  );

  // Only show topics with supported datatypes as available.
  const supportedAvailableTopics = useMemo(
    () => {
      const supportedMarkerDatatypesSet = new Set(
        Object.values(getGlobalHooks().perPanelHooks().ThreeDimensionalViz.SUPPORTED_MARKER_DATATYPES)
      );
      return availableTopics.filter((topic) => supportedMarkerDatatypesSet.has(topic.datatype));
    },
    [availableTopics]
  );

  return (
    <TopicGroupsBase
      availableTopics={supportedAvailableTopics}
      displayNameByTopic={configDisplayNameByTopic}
      errorsByTopic={sceneErrorsByTopic}
      namespacesByTopic={namespacesByTopic}
      sceneCollectorMsgForTopicSetting={sceneCollectorMsgForTopicSetting}
      {...rest}
    />
  );
}

const MemoizedTopicGroups = React.memo<UnMemoizedTopicGroupsProps>(UnMemoizedTopicGroups);

const DEFAULT_SCENE_BUILDER_DATA = {
  sceneCollectorMsgForTopicSetting: undefined,
  sceneErrorsByTopic: {},
  sceneNamespacesByTopic: {},
};

// Use the Wrapper to extract SceneBuilder related data.
export default function TopicGroupsWrapper({
  pinTopics,
  sceneBuilder,
  setShowTopicGroups,
  showTopicGroups,
  ...rest
}: TopicGroupsProps) {
  const renderTopicGroups = pinTopics || showTopicGroups;

  // Set the settingsTopic at top level so that we can collect the msg needed for topic settings from SceneBuilder and pass it down.
  const [settingsTopicName, setSettingsTopicName] = useState<?string>(undefined);

  const sceneDataRef = useRef<SceneData>(DEFAULT_SCENE_BUILDER_DATA);
  let sceneErrorsByTopic = {};
  let sceneNamespacesByTopic = {};
  let sceneCollectorMsgForTopicSetting;

  // Recompute the scene data on each render.
  if (renderTopicGroups) {
    sceneErrorsByTopic = getSceneErrorsByTopic(sceneBuilder.errors);
    sceneCollectorMsgForTopicSetting =
      (settingsTopicName &&
        (sceneBuilder.collectors[settingsTopicName] && sceneBuilder.collectors[settingsTopicName].getMessages()[0])) ||
      undefined;
    sceneNamespacesByTopic = sceneBuilder.allNamespaces.reduce((memo, { name, topic }) => {
      memo[topic] = memo[topic] || [];
      memo[topic].push(name);
      return memo;
    }, {});
  }

  // Do a deep-comparison and detect if the sceneData has changed and set `sceneDataRef` accordingly.
  const sceneDataChanged = useDeepChangeDetector(
    [sceneErrorsByTopic, sceneNamespacesByTopic, sceneCollectorMsgForTopicSetting],
    true
  );
  if (sceneDataChanged) {
    // Update the sceneData so the MemoizedTopicGroups can be re-rendered.
    sceneDataRef.current = { sceneErrorsByTopic, sceneNamespacesByTopic, sceneCollectorMsgForTopicSetting };
  }

  return (
    <MemoizedTopicGroups
      {...sceneDataRef.current}
      {...rest}
      pinTopics={pinTopics}
      sceneCollectorMsgForTopicSetting={sceneCollectorMsgForTopicSetting}
      setSettingsTopicName={setSettingsTopicName}
      setShowTopicGroups={setShowTopicGroups}
      showTopicGroups={showTopicGroups}
    />
  );
}
