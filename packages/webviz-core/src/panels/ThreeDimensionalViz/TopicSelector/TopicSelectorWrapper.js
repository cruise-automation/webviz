// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LayersIcon from "@mdi/svg/svg/layers.svg";
import MagnifyIcon from "@mdi/svg/svg/magnify.svg";
import cx from "classnames";
import { debounce } from "lodash";
import React, { useState, useRef, useCallback, useEffect } from "react";
import styled from "styled-components";

import styles from "../Layout.module.scss";
import type { SceneErrors, ErrorDetails } from "../SceneBuilder";
import TopicDisplayModeSelector, { type TopicDisplayMode, TOPIC_DISPLAY_MODES } from "./TopicDisplayModeSelector";
import TopicSelectorFlatList, { type TopicSelectorFlatListProps } from "./TopicSelectorFlatList";
import TopicSelectorMenu from "./TopicSelectorMenu";
import TopicSelectorTree from "./TopicSelectorTree";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import { colors } from "webviz-core/src/util/colors";

const SErrors = styled.div`
  color: ${colors.RED};
  padding: 8px;
  line-height: 1.2;
  li {
    margin-left: 1em;
  }
`;
const SErrorsBadge = styled.div`
  position: absolute;
  z-index: 9999;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: 10px;
  background-color: ${colors.RED};
`;
const SFilterRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 36px;
  flex-shrink: 0;
  padding-left: 8px;
  border-bottom: 1px solid ${colors.DARK8};
  background-color: rgba(255, 255, 255, 0.1);
`;

const SFloatingBox = styled.div`
  background-color: ${colors.DARK4};
  border-radius: 4px;
  padding: 0;
  box-shadow: 0 6px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  pointer-events: auto;
  flex-shrink: 0;
`;

const STopicSelectorWrapper = styled(SFloatingBox)`
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;
const STreeWrapper = styled.div`
  display: flex;
  flex-direction: column;
  overflow: auto;
  .icon {
    font-size: 14px;
  }
  &.filtered {
    .node-text {
      color: ${colors.BLUEL1};
    }
  }
`;

function listToString(kind: string, data: Iterable<string>) {
  const items = Array.from(data).filter(Boolean);
  if (!items.length) {
    return null;
  }
  return `${kind}: ${items.sort().join(", ")}`;
}
function renderErrorSection(description: string, values: Map<string, ErrorDetails>) {
  if (values.size === 0) {
    return null;
  }
  const items = [];
  values.forEach((value, topic) => {
    const details = [
      listToString(value.frameIds.size === 1 ? "frame" : "frames", value.frameIds),
      listToString(value.namespaces.size === 1 ? "namespace" : "namespaces", value.namespaces),
    ].filter(Boolean);
    if (details.length > 0) {
      items.push(`${topic} (${details.join("; ")})`);
    } else {
      items.push(topic);
    }
  });
  return (
    <div>
      {`${values.size} topic${values.size === 1 ? "" : "s"} ${description}`}:
      <ul>
        {items.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

export function TopicErrors({ sceneErrors }: { sceneErrors: SceneErrors }) {
  const genericTopicErrors = [];
  for (const [topic, message] of sceneErrors.topicsWithError) {
    const html = <div key={topic}>{`${topic}: ${message}`}</div>;
    genericTopicErrors.push(html);
  }

  return (
    <SErrors>
      {renderErrorSection("missing frame ids", sceneErrors.topicsMissingFrameIds)}
      {renderErrorSection(`missing transforms to ${sceneErrors.rootTransformID}`, sceneErrors.topicsMissingTransforms)}
      {genericTopicErrors}
    </SErrors>
  );
}

export type TopicSelectorWrapperProps = {|
  ...TopicSelectorFlatListProps,
  autoTextBackgroundColor: boolean,
  editedTopics: string[],
  topicDisplayMode: TopicDisplayMode,
  hideTopicTreeCount: number,
  onTopicSearchChange: (filterText: string) => void,
  pinTopics: boolean,
  sceneErrors: SceneErrors,
  hiddenTopics: string[],
  setHiddenTopics: ((prevTopics: string[]) => string[]) => void,
|};

// A wrapper component for TopicSelectorTree and TopicSelectorFlatList to share search menu, error UI and states
export default function TopicSelectorWrapper({
  autoTextBackgroundColor,
  checkedNodes,
  expandedNodes,
  topicDisplayMode,
  hideTopicTreeCount,
  modifiedNamespaceTopics,
  namespaces,
  onEditClick,
  onTopicSearchChange,
  pinTopics,
  saveConfig,
  sceneErrors,
  tree,
  hiddenTopics,
  setHiddenTopics,
}: TopicSelectorWrapperProps) {
  const [filterText, setFilterText] = useState("");
  const [showTopics, setShowTopics] = useState(pinTopics);
  const filterTextFieldRef = useRef();
  const debouncedOnTopicSearch = useCallback(debounce(onTopicSearchChange, 150), [onTopicSearchChange]);
  const displayMode = TOPIC_DISPLAY_MODES[topicDisplayMode] ? topicDisplayMode : TOPIC_DISPLAY_MODES.SHOW_TREE.value;

  const { filterInputPlaceholder, label } = TOPIC_DISPLAY_MODES[displayMode];

  const onToggleShowClick = useCallback(() => setShowTopics(!showTopics), [showTopics]);
  const onFilterTextChange = useCallback(
    (e: SyntheticEvent<HTMLInputElement>) => {
      const newFilterText = e.currentTarget.value;
      setFilterText(newFilterText);
      debouncedOnTopicSearch(newFilterText);
    },
    [debouncedOnTopicSearch]
  );

  useEffect(
    () => {
      if (pinTopics) {
        setShowTopics(true);
      }
    },
    [pinTopics]
  );

  useEffect(
    () => {
      // hide topicTree whenever the count changes
      if (hideTopicTreeCount >= 0) {
        setShowTopics(false);
      }
    },
    [hideTopicTreeCount]
  );

  useEffect(
    () => {
      // auto focus whenever switching to showTopics
      if (showTopics && filterTextFieldRef.current) {
        filterTextFieldRef.current.focus();
      }
    },
    [showTopics]
  );
  const hasErrors = !!(
    sceneErrors.topicsMissingFrameIds.size ||
    sceneErrors.topicsMissingTransforms.size ||
    sceneErrors.topicsWithError.size
  );

  const hideTopicSelector = !pinTopics && !showTopics;
  if (hideTopicSelector) {
    return (
      <div className={styles.buttons}>
        <Button onClick={onToggleShowClick} tooltip="Show Topic Picker">
          <Icon style={{ color: "white" }}>
            <LayersIcon />
          </Icon>
        </Button>
        {hasErrors && <SErrorsBadge />}
      </div>
    );
  }

  return (
    <STopicSelectorWrapper>
      <Flex col clip>
        <SFilterRow>
          <TopicDisplayModeSelector menuTooltip={label} saveConfig={saveConfig} topicDisplayMode={displayMode} />
          <Icon style={{ color: "rgba(255,255,255, 0.3)", padding: "10px 0 10px 10px" }}>
            <MagnifyIcon style={{ width: 16, height: 16 }} />
          </Icon>
          <input
            style={{
              flex: 1,
              margin: 0,
              background: "transparent",
              color: colors.LIGHT,
              paddingLeft: 5,
            }}
            ref={filterTextFieldRef}
            type="text"
            placeholder={filterInputPlaceholder}
            value={filterText || ""}
            onChange={onFilterTextChange}
          />
          <TopicSelectorMenu
            saveConfig={saveConfig}
            pinTopics={pinTopics}
            autoTextBackgroundColor={autoTextBackgroundColor}
          />
        </SFilterRow>
        <STreeWrapper className={cx({ filtered: !!filterText })}>
          {topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_TREE.value ? (
            <TopicSelectorTree
              checkedNodes={checkedNodes}
              expandedNodes={expandedNodes}
              modifiedNamespaceTopics={modifiedNamespaceTopics}
              namespaces={namespaces}
              onEditClick={onEditClick}
              saveConfig={saveConfig}
              tree={tree}
            />
          ) : (
            <TopicSelectorFlatList
              checkedNodes={checkedNodes}
              expandedNodes={expandedNodes}
              modifiedNamespaceTopics={modifiedNamespaceTopics}
              namespaces={namespaces}
              onEditClick={onEditClick}
              saveConfig={saveConfig}
              tree={tree}
              setHiddenTopics={setHiddenTopics}
              hiddenTopics={hiddenTopics}
              disableCheckbox={topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_SELECTED.value}
            />
          )}
        </STreeWrapper>
      </Flex>
      {hasErrors && <TopicErrors sceneErrors={sceneErrors} />}
    </STopicSelectorWrapper>
  );
}
