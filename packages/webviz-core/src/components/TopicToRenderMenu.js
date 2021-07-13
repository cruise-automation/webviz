// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CheckIcon from "@mdi/svg/svg/check.svg";
import DatabaseIcon from "@mdi/svg/svg/database.svg";
import { uniq } from "lodash";
import React from "react";
import styled from "styled-components";

import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import styles from "webviz-core/src/components/PanelToolbar/index.module.scss";
import type { Topic } from "webviz-core/src/players/types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export type TopicGroup = {
  suffix: string,
  datatype: string,
};

type Props = {
  onChange: (topic: string) => void,
  topicToRender: string,
  topics: $ReadOnlyArray<Topic>,
  // Use either one of these (or neither, to expose all topics):
  // singleTopicDatatype only supports a single datatype (search and select based on datatype)
  // topicsGroups selects the "parent" path of a group of topics (if either of the group topics suffixes+datatypes match)
  singleTopicDatatype?: string,
  topicsGroups?: TopicGroup[],
  defaultTopicToRender: ?string,
};

const SDiv = styled.div`
  display: flex;
  cursor: pointer;
  padding: 8px;
  height: 32px;
`;

const SSpan = styled.span`
  flex: flex-start;
  min-width: 150px;
  height: 17px;
`;

const SIconSpan = styled.span`
  flex: flex-end;
  svg {
    fill: white;
    width: 15px;
    height: 15px;
  }
`;

export default function TopicToRenderMenu({
  onChange,
  topicToRender,
  topics,
  topicsGroups,
  singleTopicDatatype,
  defaultTopicToRender,
}: Props) {
  if (topicsGroups && singleTopicDatatype) {
    throw new Error("Cannot set both topicsGroups and singleTopicDatatype");
  }
  const availableTopics: string[] = [];
  for (const topic of topics) {
    if (topicsGroups) {
      for (const topicGroup of topicsGroups) {
        if (topic.name.endsWith(topicGroup.suffix) && topic.datatype === topicGroup.datatype) {
          const parentTopic = topic.name.slice(0, topic.name.length - topicGroup.suffix.length);
          availableTopics.push(parentTopic);
        }
      }
    } else if (singleTopicDatatype == null || topic.datatype === singleTopicDatatype) {
      availableTopics.push(topic.name);
    }
  }
  // Keeps only the first occurrence of each topic.
  // $FlowFixMe: Flow only understands .filter(Boolean), but we want to keep empty strings.
  const renderTopics: string[] = uniq(
    [defaultTopicToRender, ...availableTopics, topicToRender].filter((t) => t != null)
  );
  const parentTopicSpan = (topic: string, available: boolean) => {
    const topicDiv = topic ? topic : <span style={{ fontStyle: "italic" }}>Default</span>;
    return (
      <span>
        {topicDiv}
        {available ? "" : " (not available)"}
      </span>
    );
  };

  const tooltip = topicsGroups
    ? `Parent topics selected by topic suffixes:\n ${topicsGroups.map((group) => group.suffix).join("\n")}`
    : singleTopicDatatype != null
    ? `Topics selected by datatype: ${singleTopicDatatype}`
    : "Select topic:";
  return (
    <Dropdown
      toggleComponent={
        <Icon
          fade
          tooltip={tooltip}
          tooltipProps={{ placement: "top" }}
          style={{ color: topicToRender === defaultTopicToRender ? colors.LIGHT1 : colors.ORANGE }}
          dataTest={"topic-set"}>
          <DatabaseIcon className={styles.icon} />
        </Icon>
      }>
      {renderTopics.map((topic) => (
        <SDiv
          style={topicToRender === topic ? { backgroundColor: "rgba(59, 46, 118, 0.6)" } : {}}
          key={topic}
          onClick={() => {
            onChange(topic);
          }}>
          <SSpan>{parentTopicSpan(topic, availableTopics.includes(topic))}</SSpan>
          {topicToRender === topic ? (
            <SIconSpan>
              <CheckIcon />
            </SIconSpan>
          ) : null}
        </SDiv>
      ))}
    </Dropdown>
  );
}
