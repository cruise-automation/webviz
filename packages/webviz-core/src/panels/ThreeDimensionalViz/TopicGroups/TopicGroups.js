// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LayersIcon from "@mdi/svg/svg/layers.svg";
import PinIcon from "@mdi/svg/svg/pin.svg";
import React, { useState, useCallback, useMemo } from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import TopicGroup from "./TopicGroup";
import {
  getTopicGroups,
  buildItemDisplayNameByTopicOrExtension,
  buildAvailableNamespacesByTopic,
  TOPIC_CONFIG,
} from "./topicGroupsUtils";
import type { TopicGroupConfig } from "./types";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import { type Topic } from "webviz-core/src/players/types";
import type { Namespace } from "webviz-core/src/types/Messages";
import { colors } from "webviz-core/src/util/colors";

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

/**
 * TODO(Audrey):
 * - topic visibility toggle
 * - group visibility toggle
 * - config migration
 * - filter with debounce
 * - edit topic settings
 */
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
          {topicGroups.map((topicGroup) => (
            <TopicGroup key={topicGroup.derivedFields.id} topicGroup={topicGroup} />
          ))}
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
