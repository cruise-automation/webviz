// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LayersIcon from "@mdi/svg/svg/layers.svg";
import { Icon as AntIcon } from "antd";
import fuzzySort from "fuzzysort";
import { omit, set, cloneDeep, compact } from "lodash";
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import KeyListener from "react-key-listener";
import scrollIntoView from "scroll-into-view-if-needed";
import styled from "styled-components";
import { useDebounce, useDebouncedCallback } from "use-debounce";

import { type Save3DConfig } from "../index";
import { DEFAULT_DEBOUNCE_TIME, KEYBOARD_SHORTCUTS, FOCUS_ITEM_OPS } from "./constants";
import CreateGroupButton from "./CreateGroupButton";
import { SInput } from "./QuickAddTopic";
import TopicGroupList from "./TopicGroupList";
import TopicGroupsMenu from "./TopicGroupsMenu";
import {
  addIsKeyboardFocusedToTopicGroups,
  buildAvailableNamespacesByTopic,
  buildItemDisplayNameByTopicOrExtension,
  getOnTopicGroupsChangeDataByKeyboardOp,
  getSceneErrorsByTopic,
  getTopicGroups,
  removeTopicPrefixes,
  updateFocusIndexesAndGetFocusData,
  FEATURE_DATA_SOURCE_PREFIXES,
  TOPIC_CONFIG,
} from "./topicGroupsUtils";
import type { FocusItemOp, TopicGroupConfig, TopicGroupType } from "./types";
import Confirm from "webviz-core/src/components/Confirm";
import Icon from "webviz-core/src/components/Icon";
import KeyboardShortcut from "webviz-core/src/components/KeyboardShortcut";
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

const STopicGroups = styled.div`
  position: relative;
  color: ${colors.TEXTL1};
  border-radius: 6px;
  background-color: ${colors.TOOLBAR};
  max-width: 440px;
  padding-bottom: 6px;
`;

/* TODO(Audrey): stay consistent with other buttons in the 3D panel, will consolidate later. */
const SIconWrapper = styled.div`
  width: 28px;
  border-radius: 4px;
  padding: 0;
  padding: 4px;
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
  filterText: string
): string[] {
  // Build a list of filtered keys for fuzzy filtering on group displayName, topic displayName and topicName.
  const allFilterKeysSet = new Set(); // no need to have duplicated filter keys
  const onlySearchOnTopics = filterText.startsWith("/");
  topicGroupsConfig.forEach((groupConfig) => {
    allFilterKeysSet.add(groupConfig.displayName);
    groupConfig.items.forEach(({ topicName, displayName }) => {
      allFilterKeysSet.add(topicName);
      if (onlySearchOnTopics) {
        return;
      }
      if (displayName) {
        allFilterKeysSet.add(displayName);
      } else if (displayNameByTopic[topicName]) {
        allFilterKeysSet.add(displayNameByTopic[topicName]);
      }
    });
  });

  return fuzzySort.go(filterText, [...allFilterKeysSet], { limit: 100 }).map((res: { target: string }) => res.target);
}

export function TopicGroupsBase({
  availableTopics = [],
  containerHeight,
  displayNameByTopic = {},
  errorsByTopic,
  namespacesByTopic = {},
  onExitTopicGroupFocus,
  onMigrateToTopicGroupConfig,
  pinTopics,
  saveConfig,
  sceneCollectorMsgForTopicSetting,
  setSettingsTopicName,
  topicGroupsConfig,
  dataTestShowErrors,
}: TopicGroupsBaseProps) {
  const inputRef = useRef<?HTMLInputElement>();
  const containerRef = useRef<?HTMLDivElement>();
  // Use focusIndex to control which group/topic/action row to focus on during keyboard nav.
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  // For keyboard ops that need to be handled by UI (New topic / New Group), the focusItemOp will be passed down to
  // the specific component to perform the UI changes, and the component will clear focusItemOp upon completing the UI changes.
  const [focusItemOp, setFocusItemOp] = useState<?FocusItemOp>();

  const onFocusOnContainer = useCallback(() => {
    // Focus on the container if it's not already focused.
    if (containerRef.current && document.activeElement !== containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Pass keyboard nav info down by context to avoid too many props.
  const keyboardContextValue = useMemo(
    () => ({ focusIndex, setFocusIndex, focusItemOp, setFocusItemOp, onFocusOnContainer }),
    [focusIndex, focusItemOp, onFocusOnContainer]
  );

  // Focus on the container immediately when the pinTopics becomes true
  useEffect(
    () => {
      if (pinTopics) {
        onFocusOnContainer();
      }
    },
    [onFocusOnContainer, pinTopics]
  );

  const [filterText, setFilterText] = useState<string>("");
  const [filteredKeysSet, setFilteredKeysSet] = useState<?Set<string>>();

  const [debouncedFilterText] = useDebounce(filterText, DEFAULT_DEBOUNCE_TIME);

  useEffect(
    () => {
      // Update the filteredKeys based on filterText. Debounce it since the user might type very fast.
      if (debouncedFilterText) {
        setFilteredKeysSet(new Set(getFilteredKeys(topicGroupsConfig, displayNameByTopic, filterText)));
      } else {
        setFilteredKeysSet(undefined);
      }
    },
    [debouncedFilterText, displayNameByTopic, filterText, topicGroupsConfig]
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
    filterText,
    filteredKeysSet,
    hasFeatureColumn,
  });

  // Update the topicGroups and assign focusIndexes according to the final visibility/expanded states, and collect `focusData`
  // which is an array that can map indexes (focusIndex) to
  //  - objectPath: for getting the group/topic data once the user triggered a keyboard op
  //  - focusType: including GROUP, NEW_GROUP, TOPIC, NEW_TOPIC, which tells what kind of data and field we need to get to perform the op
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
          boundary: scrollContainerElem,
          block: "nearest",
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
        ArrowDown: (e) => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.ArrowDown),
        ArrowUp: (e) => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.ArrowUp),
        ArrowLeft: (e) => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.ArrowLeft),
        ArrowRight: (e) => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.ArrowRight),
        Enter: (e) => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.Enter, e.shiftKey),
        Tab: (e) => debouncedSharedOnKeyHandler(FOCUS_ITEM_OPS.Enter),
      };
    },
    [debouncedSharedOnKeyHandler]
  );

  const keyDownHandlers = useMemo(
    () => {
      let handlers = {
        t: (e) => {
          e.preventDefault();
          // Toggle pinTopic when the user interacted with topic group UI. Note this is different from toggling
          // when clicked 3D panel which is handled in Layout.js.
          saveConfig({ pinTopics: !pinTopics });
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
            // Toggle pinTopic off if the topic group is already open.
            if (pinTopics) {
              saveConfig({ pinTopics: false });
            } else {
              // Exit topic group focus if the topic group is closed.
              onExitTopicGroupFocus();
            }
          } else if (containerEl.contains(activeEl)) {
            // Otherwise, get out of any other topic group focus elements, and simply focus on the topic group container.
            e.preventDefault();
            onFocusOnContainer();
          }
        },
      };
      if (pinTopics) {
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
    [debouncedSharedOnKeyHandler, onExitTopicGroupFocus, onFocusOnContainer, pinTopics, saveConfig, sharedHandlers]
  );

  return (
    <STopicGroupsContainer style={{ maxHeight: containerHeight - 30 }}>
      <div
        style={{ maxHeight: containerHeight - 30 }}
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
          <SIconWrapper style={{ backgroundColor: pinTopics ? "transparent" : "#2d2c33" }}>
            <Icon
              tooltipProps={{
                contents: KEYBOARD_SHORTCUTS.map(({ description, keys }, idx) => (
                  <KeyboardShortcut key={idx} description={description} keys={keys} />
                )),
              }}
              dataTest="open-topic-picker"
              active={pinTopics}
              fade
              medium
              onClick={() => saveConfig({ pinTopics: !pinTopics })}
              style={{ color: "white" }}>
              <LayersIcon />
            </Icon>
          </SIconWrapper>
          {pinTopics && (
            <STopicGroups>
              <STopicGroupsHeader>
                <SFilter>
                  <AntIcon type="search" style={{ fontSize: 13 }} />
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
              </div>
            </STopicGroups>
          )}
        </KeyboardContext.Provider>
      </div>
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
  sceneBuilder: SceneBuilder,
|};

type UnMemoizedTopicGroupsProps = {|
  ...SharedProps,
  ...SceneData,
  sceneCollectorMsgForTopicSetting: any,
  setSettingsTopicName: (topicName: ?string) => void,
  availableTfs: string[],
|};
// Use the wrapper component to handle top level data processing.
function UnMemoizedTopicGroups({
  availableTfs,
  availableTopics,
  sceneCollectorMsgForTopicSetting,
  sceneErrorsByTopic,
  sceneNamespacesByTopic,
  ...rest
}: UnMemoizedTopicGroupsProps) {
  const { configDisplayNameByTopic, configNamespacesByTopic } = useMemo(() => {
    return {
      configDisplayNameByTopic: buildItemDisplayNameByTopicOrExtension(TOPIC_CONFIG),
      configNamespacesByTopic: buildAvailableNamespacesByTopic(TOPIC_CONFIG),
    };
  }, []);

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

export default function TopicGroupsWrapper({ pinTopics, sceneBuilder, ...rest }: TopicGroupsProps) {
  // Set the settingsTopic at top level so that we can collect the msg needed for topic settings from SceneBuilder and pass it down.
  const [settingsTopicName, setSettingsTopicName] = useState<?string>(undefined);

  const sceneDataRef = useRef<SceneData>(DEFAULT_SCENE_BUILDER_DATA);
  let sceneErrorsByTopic = {};
  let sceneNamespacesByTopic = {};
  let sceneCollectorMsgForTopicSetting;

  // Recompute the scene data on each render.
  if (pinTopics) {
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
      setSettingsTopicName={setSettingsTopicName}
      pinTopics={pinTopics}
      sceneCollectorMsgForTopicSetting={sceneCollectorMsgForTopicSetting}
    />
  );
}
