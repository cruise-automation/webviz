// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import TopicGroup from "./TopicGroup";
import type { TopicGroupsType } from "./types";
import { colors } from "webviz-core/src/util/colors";

const STopicGroups = styled.div`
  color: ${colors.TEXTL1};
  border-radius: 8px;
  padding-top: 8px;
  background-color: ${colors.TOOLBAR};
`;

const SMutedText = styled.div`
  color: ${colors.GRAY};
  line-height: 1.4;
  margin: 8px 12px;
`;

type Props = {
  topicGroups: TopicGroupsType,
};

export default function TopicGroups({ topicGroups }: Props) {
  return (
    <STopicGroups>
      <SMutedText>
        Topic Group Management is an experimental feature under active development. You can use the existing topic tree
        by setting <b>Always off</b> from the Experimental Features menu.
      </SMutedText>
      {topicGroups.map((topicGroup) => (
        <TopicGroup key={topicGroup.id} topicGroup={topicGroup} />
      ))}
    </STopicGroups>
  );
}
