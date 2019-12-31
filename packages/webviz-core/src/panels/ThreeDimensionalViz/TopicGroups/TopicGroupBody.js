// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import TopicItemRow from "./TopicItemRow";
import type { TopicGroupType, OnTopicGroupsChange } from "./types";
import { colors } from "webviz-core/src/util/colors";

const STopicGroupBody = styled.div`
  width: 100%;
  background-color: ${colors.TOOLBARL1};
`;

type Props = {|
  topicGroup: TopicGroupType,
  objectPath: string,
  onTopicGroupsChange: OnTopicGroupsChange,
|};

export default function TopicGroupBody({
  objectPath,
  topicGroup,
  topicGroup: { displayName, expanded, items },
  onTopicGroupsChange,
}: Props) {
  return (
    <STopicGroupBody>
      {!items.length && <div>There are no items in this group. Add one</div>}
      {items.map((item, idx) => (
        <TopicItemRow
          objectPath={`${objectPath}.items.[${idx}]`}
          onTopicGroupsChange={onTopicGroupsChange}
          item={item}
          key={item.derivedFields.id}
        />
      ))}
    </STopicGroupBody>
  );
}
