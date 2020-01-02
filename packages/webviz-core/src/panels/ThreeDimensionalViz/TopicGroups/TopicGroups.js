// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChevronDownIcon from "@mdi/svg/svg/chevron-down.svg";
import ChevronUpIcon from "@mdi/svg/svg/chevron-up.svg";
import LayersIcon from "@mdi/svg/svg/layers.svg";
import PinIcon from "@mdi/svg/svg/pin.svg";
import { omit, set, cloneDeep, unset } from "lodash";
import Collapse from "rc-collapse";
import React, { useState, useCallback, useMemo } from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import TopicGroupBody from "./TopicGroupBody";
import TopicGroupHeader, { STopicGroupName, SEyeIcon } from "./TopicGroupHeader";
import { SMenuWrapper } from "./TopicGroupMenu";
import {
  getTopicGroups,
  buildItemDisplayNameByTopicOrExtension,
  buildAvailableNamespacesByTopic,
  TOPIC_CONFIG,
} from "./topicGroupsUtils";
import type { TopicGroupConfig, TopicGroupType } from "./types";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import { type Topic } from "webviz-core/src/players/types";
import type { Namespace } from "webviz-core/src/types/Messages";
import { colors } from "webviz-core/src/util/colors";

require("rc-collapse/assets/index.css");

const STopicGroupsContainer = styled.div`
  position: absolute;
  top: 15px;
  left: 15px;
  bottom: 15px;
  z-index: 102;
`;

const STopicGroups = styled.div`
  color: ${colors.TEXTL1};
  border-radius: 8px;
  background-color: ${colors.TOOLBAR};
  overflow: auto;
  max-width: 400px;
  max-height: 90%;
  pointer-events: all;
  .rc-collapse {
    background: transparent;
    border-radius: 0;
    border: none;
    padding: 0;
    margin: 0;
    .rc-collapse-item {
      border: none;
      padding: 0;
      margin: 0;
      .rc-collapse-header {
        margin: 0;
        border: none;
        transition: 0.3s;
        padding: 4px 0px 4px 24px;
        color: unset;
        &:hover {
          color: ${colors.LIGHT};
          background-color: ${colors.HOVER_BACKGROUND_COLOR};
          ${STopicGroupName} {
            color: ${colors.YELLOWL1};
          }
          ${SEyeIcon} {
            color: white;
            opacity: 1;
          }
          ${SMenuWrapper} {
            color: white;
            opacity: 1;
          }
        }
      }
      .rc-collapse-content {
        color: unset;
        padding: 0;
        border: none;
        margin: 0;
        background: transparent;
        .rc-collapse-content-box {
          margin: 0;
        }
      }
    }
  }
`;

const SMutedText = styled.div`
  color: ${colors.GRAY};
  line-height: 1.4;
  margin: 8px 12px;
`;

const STopicGroupsHeader = styled.div`
  display: flex;
  padding: 8px;
  align-items: center;
  background-color: ${colors.DARK5};
`;
const SFilter = styled.div`
  display: flex;
  flex: 1;
`;

type BaseProps = {|
  topicGroupsConfig: TopicGroupConfig[],
  namespacesByTopic: { [topicName: string]: string[] },
  displayNameByTopic: { [topicName: string]: string },
  availableTopics: Topic[],
  pinTopics: boolean,
  saveConfig: Save3DConfig,
|};
type Props = {|
  topicGroupsConfig: TopicGroupConfig[],
  availableTopics: Topic[],
  pinTopics: boolean,
  saveConfig: Save3DConfig,
  availableTfs: string[],
  allNamespaces: Namespace[],
|};

export function TopicGroupsBase({
  topicGroupsConfig,
  displayNameByTopic = {},
  namespacesByTopic = {},
  availableTopics = [],
  pinTopics,
  saveConfig,
}: BaseProps) {
  const [isOpen, setIsOpen] = useState(pinTopics);

  const toggleIsOpen = useCallback(() => setIsOpen(!isOpen), [isOpen]);
  const togglePinTopics = useCallback(() => saveConfig({ pinTopics: !pinTopics }), [pinTopics, saveConfig]);

  const topicGroups = getTopicGroups(topicGroupsConfig, {
    displayNameByTopic,
    namespacesByTopic,
    availableTopics,
  });

  const saveNewTopicGroupsToConfig = useCallback(
    (newTopicGroups: TopicGroupType[]) => {
      const newTopicGroupsConfig = newTopicGroups.map((group) => ({
        ...omit(group, "derivedFields"),
        items: group.items.map((item) => omit(item, "derivedFields")),
      }));
      saveConfig({ topicGroups: newTopicGroupsConfig });
    },
    [saveConfig]
  );

  const onCollapseChange = useCallback(
    (activeKeys: string[]) =>
      saveNewTopicGroupsToConfig(
        cloneDeep(topicGroups).map((group) => ({
          ...group,
          expanded: activeKeys.includes(group.derivedFields.id),
        }))
      ),
    [saveNewTopicGroupsToConfig, topicGroups]
  );

  const onTopicGroupsChange = useCallback(
    (objectPath: string, newValue: any, options?: {| removeValue?: boolean |}) => {
      let newTopicGroups = cloneDeep(topicGroups);
      if (options && options.removeValue) {
        // unset the topic group or topic item
        unset(newTopicGroups, objectPath);
        // filter out the empty value
        newTopicGroups = newTopicGroups
          .filter(Boolean)
          .map((group) => ({ ...group, items: group.items.filter(Boolean) }));
        saveNewTopicGroupsToConfig(newTopicGroups);
        return;
      }
      // Replace the field value with newValue and save to config.
      // Make a deep copy of topicGroups to avoid mutation bugs.
      saveNewTopicGroupsToConfig(set(newTopicGroups, objectPath, newValue));
    },
    [saveNewTopicGroupsToConfig, topicGroups]
  );

  return (
    <STopicGroupsContainer>
      <ChildToggle position="below" isOpen={isOpen || pinTopics} onToggle={toggleIsOpen} dataTest="open-topic-picker">
        <Icon tooltip="Topic Picker" medium fade active={isOpen} style={{ color: "white" }}>
          <LayersIcon />
        </Icon>
        <STopicGroups>
          <STopicGroupsHeader>
            <SFilter>{/* TODO(Audrey) */}</SFilter>
            <Icon
              tooltip={pinTopics ? "Unpin Topic Picker" : "Pin Topic Picker"}
              small
              fade
              active={pinTopics}
              onClick={togglePinTopics}
              style={{ color: pinTopics ? colors.HIGHLIGHT : colors.LIGHT }}>
              <PinIcon />
            </Icon>
          </STopicGroupsHeader>
          <SMutedText>
            Topic Group Management is an experimental feature under active development. You can use the existing topic
            tree by selecting <b>Always off</b> in the Experimental Features menu.
          </SMutedText>
          <Collapse
            defaultActiveKey={topicGroups
              .map((group) => (group.expanded ? group.derivedFields.id : null))
              .filter(Boolean)}
            expandIcon={({ expanded }) => (
              <Icon medium fade style={{ marginRight: 4 }}>
                {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Icon>
            )}
            onChange={onCollapseChange}>
            {topicGroups.map((topicGroup, idx) => (
              <Collapse.Panel
                className={`test-${topicGroup.derivedFields.id}`}
                key={topicGroup.derivedFields.id}
                header={
                  <TopicGroupHeader
                    onTopicGroupsChange={onTopicGroupsChange}
                    topicGroup={topicGroup}
                    objectPath={`[${idx}]`}
                  />
                }>
                {topicGroup.expanded && (
                  <TopicGroupBody
                    key={topicGroup.derivedFields.id}
                    objectPath={`[${idx}]`}
                    topicGroup={topicGroup}
                    onTopicGroupsChange={onTopicGroupsChange}
                  />
                )}
              </Collapse.Panel>
            ))}
          </Collapse>
        </STopicGroups>
      </ChildToggle>
    </STopicGroupsContainer>
  );
}

// Use the wrapper component to handle top level data processing
export default function TopicGroups({ allNamespaces, availableTfs, ...rest }: Props) {
  const { configDisplayNameByTopic, configNamespacesByTopic } = useMemo(() => {
    return {
      configDisplayNameByTopic: buildItemDisplayNameByTopicOrExtension(TOPIC_CONFIG),
      configNamespacesByTopic: buildAvailableNamespacesByTopic(TOPIC_CONFIG),
    };
  }, []);

  const namespacesByTopic = useMemo(
    () => {
      const dataSourceNamespacesByTopic = allNamespaces.reduce((memo, { name, topic }) => {
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
    [allNamespaces, availableTfs, configNamespacesByTopic]
  );

  return (
    <TopicGroupsBase displayNameByTopic={configDisplayNameByTopic} namespacesByTopic={namespacesByTopic} {...rest} />
  );
}
