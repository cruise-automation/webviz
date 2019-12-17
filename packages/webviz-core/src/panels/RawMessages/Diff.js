// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import PlusMinusIcon from "@mdi/svg/svg/plus-minus.svg";
import React, { useMemo } from "react";
import styled from "styled-components";

import type { RawMessagesConfig } from "./index";
import { Item, SubMenu } from "webviz-core/src/components/Menu";
import { splitTopicPathOnTopicName } from "webviz-core/src/components/MessageHistory/parseRosPath";
import { diffLabels, diffArrow } from "webviz-core/src/panels/RawMessages/getDiff";
import type { Topic } from "webviz-core/src/players/types";

export const SDiffSpan = styled.span`
  padding: 0px 4px;
  text-decoration: inherit;
`;

export function HighlightedValue({ itemLabel, keyPath }: { itemLabel: string, keyPath: Array<string | number> }) {
  // react-json-tree's valueRenderer only gets called for primitives, so diff before/after values must be at same level by the time it gets to the tree
  const splitItemLabel = `${itemLabel}`.split(` ${diffArrow} `);
  const itemLabelContainsChange = splitItemLabel.length === 2;
  if (itemLabelContainsChange) {
    const [before, after] = splitItemLabel;
    const beforeText = JSON.parse(JSON.stringify(before));
    const afterText = JSON.parse(JSON.stringify(after));
    return (
      <SDiffSpan style={{ color: diffLabels.CHANGED.color }}>{`${beforeText} ${diffArrow} ${afterText}`}</SDiffSpan>
    );
  }
  return <SDiffSpan>{itemLabel}</SDiffSpan>;
}

export function DiffSettings(props: {
  topics: Topic[],
  topicName: string,
  saveConfig: ($Shape<RawMessagesConfig>) => void,
  diffTopicName: ?string,
}) {
  const { topics, topicName, saveConfig, diffTopicName } = props;
  const baseTopicName = useMemo(() => splitTopicPathOnTopicName(topicName)?.topicName, [topicName]);
  const availTopics = useMemo(() => topics.filter((topic) => topic.name !== topicName), [topicName, topics]);
  const singleTopicDatatype = useMemo(
    () => {
      const baseTopic = topics.find((topic) => topic.name === baseTopicName);
      return baseTopic ? baseTopic.datatype : null;
    },
    [baseTopicName, topics]
  );
  const validTopics = useMemo(
    () => availTopics.filter((topic) => topic.datatype === singleTopicDatatype && topic.name !== baseTopicName),
    [availTopics, baseTopicName, singleTopicDatatype]
  );

  if (!validTopics.length) {
    return (
      <Item disabled icon={<PlusMinusIcon />}>
        Diff with {diffTopicName ? splitTopicPathOnTopicName(diffTopicName)?.topicName : "topic (by datatype)"}
      </Item>
    );
  }

  return (
    <SubMenu direction="right" text="Diff with topic (by datatype):" icon={<PlusMinusIcon />}>
      <>
        <Item key="None" onClick={() => saveConfig({ diffTopicName: "" })} checked={!diffTopicName}>
          None
        </Item>
        {validTopics.map((topic) => (
          <Item
            key={topic.name}
            checked={diffTopicName === topic.name}
            onClick={() => saveConfig({ diffTopicName: topic.name })}>
            {topic.name}
          </Item>
        ))}
        <hr />
      </>
    </SubMenu>
  );
}
