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
import React, { useState, useCallback, useMemo, useEffect } from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import { DEFAULT_IMPORTED_GROUP_NAME } from "./constants";
import CreateGroupButton from "./CreateGroupButton";
import { SInput, SBrowseButton } from "./QuickAddTopic";
import TopicGroupList from "./TopicGroupList";
import {
  getSceneErrorsByTopic,
  getTopicGroups,
  buildItemDisplayNameByTopicOrExtension,
  buildAvailableNamespacesByTopic,
  removeTopicPrefixes,
  TOPIC_CONFIG,
} from "./topicGroupsUtils";
import type { TopicGroupConfig, TopicGroupType, SceneCollectors } from "./types";
import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import Modal from "webviz-core/src/components/Modal";
import { RenderToBodyComponent } from "webviz-core/src/components/renderToBody";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import { type Topic } from "webviz-core/src/players/types";
import { colors } from "webviz-core/src/util/colors";
import { useDebouncedValue } from "webviz-core/src/util/hooks";

const STopicGroupsContainer = styled.div`
  position: absolute;
  top: 15px;
  left: 15px;
  bottom: 15px;
  z-index: 102;
`;

const STopicGroups = styled.div`
  position: relative;
  color: ${colors.TEXTL1};
  border-radius: 8px;
  background-color: ${colors.TOOLBAR};
  overflow: auto;
  max-width: 440px;
  max-height: 94%;
  pointer-events: all;
`;

const SMutedText = styled.div`
  color: ${colors.GRAY};
  line-height: 1.4;
  margin: 8px 16px 0 16px;
`;

const SImportBtnWrapper = styled.div`
  text-align: right;
  padding-right: ${({ paddingRight }: { paddingRight?: number }) => paddingRight || 0}px;
`;

const STopicGroupsHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  padding: 0 8px;
  align-items: center;
  background-color: ${colors.DARK5};
`;

const SFilter = styled.div`
  display: flex;
  padding: 8px 8px 8px 4px;
  align-items: center;
  flex: 1;
`;

const SMigrationModal = styled.div`
  background: ${colors.TOOLBAR};
  color: ${colors.GRAY};
  line-height: 1.4;
  padding: 32px 16px 16px 16px;
`;

type SharedProps = {|
  availableTopics: Topic[],
  onMigrateToTopicGroupConfig: () => void,
  pinTopics: boolean,
  saveConfig: Save3DConfig,
  topicGroupsConfig: TopicGroupConfig[],
|};
type TopicGroupsBaseProps = {|
  ...SharedProps,
  displayNameByTopic: { [topicName: string]: string },
  errorsByTopic: { [topicName: string]: string[] },
  namespacesByTopic: { [topicName: string]: string[] },
  sceneCollectors: SceneCollectors,
  dataTestShowErrors?: boolean,
|};

export function getFilteredKeys(
  topicGroupsConfig: TopicGroupConfig[],
  displayNameByTopic: { [topicName: string]: string },
  filterText: string
): string[] {
  // Build a list of filtered keys for fuzzy filtering on group displayName, topic displayName and topicName.
  const allFilterKeysSet = new Set(); // no need to have duplicated filter allFilterKeysSet
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
  displayNameByTopic = {},
  errorsByTopic,
  namespacesByTopic = {},
  onMigrateToTopicGroupConfig,
  pinTopics,
  saveConfig,
  sceneCollectors,
  topicGroupsConfig,
  dataTestShowErrors,
}: TopicGroupsBaseProps) {
  const [showMigrationModal, setShowMigrationModal] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>("");
  const [filteredKeysSet, setFilteredKeysSet] = useState<?Set<string>>();

  const debouncedFilterText = useDebouncedValue(filterText, 100);

  useEffect(
    () => {
      // Update the filteredKeys based on filterText. Debounce it since as the user might type very fast.
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

  const topicGroups = getTopicGroups(topicGroupsConfig, {
    displayNameByTopic,
    namespacesByTopic,
    availableTopics,
    errorsByTopic,
    filterText,
    filteredKeysSet,
  });

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

  return (
    <STopicGroupsContainer>
      <Icon
        dataTest="open-topic-picker"
        onClick={() => saveConfig({ pinTopics: !pinTopics })}
        medium
        fade
        active={pinTopics}
        style={{ color: "white" }}>
        <LayersIcon />
      </Icon>
      {pinTopics && (
        <>
          <RenderToBodyComponent>
            <>
              {/* // TODO(Audrey): remove migration modal once migration is done  */}
              {showMigrationModal && (
                <Modal
                  onRequestClose={() => setShowMigrationModal(false)}
                  contentStyle={{
                    maxHeight: "calc(100vh - 200px)",
                    maxWidth: 480,
                    display: "flex",
                    flexDirection: "column",
                  }}>
                  <SMigrationModal>
                    <p>
                      Import your current topic tree selections as a new topic group (
                      <b>{DEFAULT_IMPORTED_GROUP_NAME}</b>) and save it in the panel config.
                    </p>
                    <SImportBtnWrapper>
                      <Button style={{ background: "transparent" }} onClick={() => setShowMigrationModal(false)}>
                        Cancel
                      </Button>
                      <Button
                        isPrimary
                        onClick={() => {
                          onMigrateToTopicGroupConfig();
                          setShowMigrationModal(false);
                        }}>
                        Import
                      </Button>
                    </SImportBtnWrapper>
                  </SMigrationModal>
                </Modal>
              )}
            </>
          </RenderToBodyComponent>
          <STopicGroups>
            <STopicGroupsHeader>
              <SFilter>
                <AntIcon type="search" style={{ fontSize: 13 }} />
                <SInput
                  value={filterText}
                  data-test="filter-input"
                  placeholder="Filter topics"
                  onChange={(ev) => setFilterText(ev.target.value)}
                />
              </SFilter>
            </STopicGroupsHeader>
            <SMutedText>
              Topic Group Management is an experimental feature under active development. You can use the existing topic
              tree by selecting <b>Always off</b> in the Experimental Features menu.
            </SMutedText>
            <SImportBtnWrapper paddingRight={8}>
              <SBrowseButton onClick={() => setShowMigrationModal(true)}>Import settings</SBrowseButton>
            </SImportBtnWrapper>
            <TopicGroupList
              topicGroups={topicGroups}
              availableTopicNames={nonPrefixedAvailableTopicNames}
              dataTestShowErrors={!!dataTestShowErrors}
              displayNameByTopic={displayNameByTopic}
              onTopicGroupsChange={onTopicGroupsChange}
              onAddGroup={onAddGroup}
              sceneCollectors={sceneCollectors}
            />
            <CreateGroupButton
              availableTopicNames={nonPrefixedAvailableTopicNames}
              displayNameByTopic={displayNameByTopic}
              onAddGroup={onAddGroup}
            />
          </STopicGroups>
        </>
      )}
    </STopicGroupsContainer>
  );
}

type TopicGroupsProps = {|
  ...SharedProps,
  availableTfs: string[],
  sceneBuilder: SceneBuilder,
|};

// Use the wrapper component to handle top level data processing.
export default function TopicGroups({ availableTfs, availableTopics, sceneBuilder, ...rest }: TopicGroupsProps) {
  const { configDisplayNameByTopic, configNamespacesByTopic } = useMemo(() => {
    return {
      configDisplayNameByTopic: buildItemDisplayNameByTopicOrExtension(TOPIC_CONFIG),
      configNamespacesByTopic: buildAvailableNamespacesByTopic(TOPIC_CONFIG),
    };
  }, []);

  const namespacesByTopic = useMemo(
    () => {
      const dataSourceNamespacesByTopic = sceneBuilder.allNamespaces.reduce((memo, { name, topic }) => {
        memo[topic] = memo[topic] || [];
        memo[topic].push(name);
        return memo;
      }, {});
      return {
        ...dataSourceNamespacesByTopic,
        ...configNamespacesByTopic,
        ...(availableTfs.length ? { "/tf": availableTfs } : undefined),
      };
    },
    [availableTfs, configNamespacesByTopic, sceneBuilder.allNamespaces]
  );
  const errorsByTopic = getSceneErrorsByTopic(sceneBuilder.errors);
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
      errorsByTopic={errorsByTopic}
      namespacesByTopic={namespacesByTopic}
      sceneCollectors={sceneBuilder.collectors}
      {...rest}
    />
  );
}
