// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { omit } from "lodash";
import React from "react";
import styled from "styled-components";

import TopicItemRow from "./TopicItemRow";
import type { TopicGroupType } from "./types";
import { colors } from "webviz-core/src/util/colors";

const STopicGroupBody = styled.div`
  width: 100%;
  background-color: ${colors.TOOLBARL1};
`;

type Props = {|
  topicGroup: TopicGroupType,
  onTopicGroupChange: (newTopicGroupConfig: TopicGroupType) => void,
|};

export default function TopicGroupBody({
  topicGroup,
  topicGroup: {
    displayName,
    expanded,

    derivedFields: { items },
  },
  onTopicGroupChange,
}: Props) {
  return (
    <STopicGroupBody>
      {!items.length && <div>There are no items in this group. Add one</div>}
      {items.map((item, idx) => (
        <TopicItemRow
          onItemChange={(newItem) => {
            const newItems = [...items.slice(0, idx), newItem, ...items.slice(idx + 1)];
            onTopicGroupChange(
              omit(
                {
                  ...topicGroup,
                  items: newItems.map((topicItem) => omit(topicItem, "derivedFields")),
                },
                "derivedFields"
              )
            );
          }}
          item={item}
          key={item.derivedFields.id}
        />
      ))}
    </STopicGroupBody>
  );
}
