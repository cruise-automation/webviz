// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import DataSourceBadge from "./DataSourceBadge";
import Namespaces from "./Namespaces";
import type { TopicItem } from "./types";
import { colors } from "webviz-core/src/util/colors";

const SItemRow = styled.div`
  padding: 8px;
  transition: 0.3s;
  &:hover {
    cursor: pointer;
    background-color: ${colors.HOVER_BACKGROUND_COLOR};
  }
`;

const SItemMain = styled.div`
  display: flex;
`;

const SItemMainLeft = styled.div`
  color: ${colors.LIGHT2};
  font-size: 10px;
  flex: 1;
`;

const SItemMainRight = styled.div`
  min-width: 84px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
`;

export const SDisplayName = styled.div`
  color: ${colors.LIGHT};
  font-size: 14px;
  margin-bottom: 4px;
  word-break: break-word;
`;

export const SName = styled.div`
  color: ${colors.LIGHT2};
  font-size: 10px;
  word-break: break-word;
`;

type Props = {|
  item: TopicItem,
|};

export default function TopicItemRow({
  item: {
    topicName,
    derivedFields: { displayName, namespaceItems, displayVisibilityBySource },
  },
}: Props) {
  return (
    <SItemRow>
      <SItemMain>
        <SItemMainLeft>
          <SDisplayName>{displayName}</SDisplayName>
          {topicName !== displayName && <SName>{topicName}</SName>}
        </SItemMainLeft>
        <SItemMainRight>
          {Object.keys(displayVisibilityBySource).map((key) => (
            <DataSourceBadge key={key} {...displayVisibilityBySource[key]} />
          ))}
        </SItemMainRight>
      </SItemMain>
      {namespaceItems.length > 0 && <Namespaces topicName={topicName} namespaceItems={namespaceItems} />}
    </SItemRow>
  );
}
