// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";
import styled from "styled-components";

import { ITEM_MAIN_PADDING_LEFT, DATA_SOURCE_BADGE_SIZE } from "./constants";
import DataSourceBadge from "./DataSourceBadge";
import { SDataSourceBadgesWrapper } from "./TopicItemRowHeader";
import type { NamespaceItem, OverrideColorBySource } from "./types";
import { colors } from "webviz-core/src/util/colors";

const SNamespace = styled.div`
  padding: 2px 28px 2px ${ITEM_MAIN_PADDING_LEFT}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: 0.3s;
  &:hover {
    background-color: ${colors.HOVER_BACKGROUND_COLOR};
  }
`;

const SName = styled.div`
  font-size: 13px;
  color: ${colors.LIGHT2};
`;

type Props = {|
  ...NamespaceItem,
  dataSourceBadgeSlots: number,
  isBaseNamespaceAvailable: boolean,
  onToggleNamespace: ({| visible: boolean, dataSourcePrefix: string, namespace: string |}) => void,
  overrideColorBySource: OverrideColorBySource,
  topicName: string,
|};

export default function Namespace({
  dataSourceBadgeSlots,
  displayVisibilityBySource,
  isBaseNamespaceAvailable,
  name,
  onToggleNamespace,
  overrideColorBySource,
  topicName,
}: Props) {
  const [isHovering, setIsHovering] = useState(false);
  return (
    <SNamespace key={name} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <SName>{name}</SName>
      <SDataSourceBadgesWrapper
        dataSourceBadgeSlots={dataSourceBadgeSlots}
        paddingLeft={
          !isBaseNamespaceAvailable && Object.keys(displayVisibilityBySource).length < dataSourceBadgeSlots
            ? DATA_SOURCE_BADGE_SIZE
            : 0
        }>
        {Object.keys(displayVisibilityBySource).map((dataSourcePrefix) => {
          const { visible, available, badgeText, isParentVisible } = displayVisibilityBySource[dataSourcePrefix];
          return (
            <DataSourceBadge
              available={available}
              badgeText={badgeText}
              dataTest={`namespace-${dataSourcePrefix}${topicName}:${name}`}
              isHovering={isHovering}
              isNamespace
              isParentVisible={!!isParentVisible}
              key={dataSourcePrefix}
              overrideColor={overrideColorBySource[dataSourcePrefix]}
              visible={visible}
              onToggleVisibility={() => {
                onToggleNamespace({
                  visible: !visible,
                  dataSourcePrefix,
                  namespace: name,
                });
              }}
            />
          );
        })}
      </SDataSourceBadgesWrapper>
    </SNamespace>
  );
}
