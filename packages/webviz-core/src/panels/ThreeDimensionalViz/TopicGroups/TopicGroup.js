// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import ItemRow from "./ItemRow";
import type { TopicGroupType } from "./types";
import { colors } from "webviz-core/src/util/colors";

const STopicGroup = styled.div`
  padding: 4px 0px;
`;
const STopicGroupHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px 8px;
`;
const STopicGroupBody = styled.div``;

const STopicGroupName = styled.div`
  font-size: 16px;
  color: ${colors.YELLOWL1};
  flex: 1;
`;

type Props = {
  topicGroup: TopicGroupType,
};

export default function TopicGroup({ topicGroup: { displayName, expanded, items } }: Props) {
  return (
    <STopicGroup>
      <STopicGroupHeader>
        <STopicGroupName>{displayName}</STopicGroupName>
      </STopicGroupHeader>
      {expanded && (
        <STopicGroupBody>
          {!items.length && <div>There are no items in this group. Add one</div>}
          {items.map((item) => (
            <ItemRow item={item} key={item.id} />
          ))}
        </STopicGroupBody>
      )}
    </STopicGroup>
  );
}
