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
import type { NamespaceItem } from "./types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SNamespace = styled.div`
  padding: 2px 28px 2px ${ITEM_MAIN_PADDING_LEFT}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* HACK[Audrey]: weird style issue, can not click data source badges, collapse arrow or topic names without a little transition time.
   * Might be related to the nested accordions' height change which happens after the accordion active state is set.
   */
  transition: 0.1s;
  &:hover {
    background-color: ${colors.HOVER_BACKGROUND_COLOR};
  }
`;

const SName = styled.div`
  font-size: 13px;
  color: ${colors.LIGHT2};
`;

export const SDataSourceBadgePlaceholder = styled.div`
  width: ${DATA_SOURCE_BADGE_SIZE}px;
  height: ${DATA_SOURCE_BADGE_SIZE}px;
`;
type Props = {|
  ...NamespaceItem,
  hasFeatureColumn: boolean,
  onToggleNamespace: ({| visible: boolean, columnIndex: number, namespace: string |}) => void,
  overrideColorByColumn: (?string)[],
  topicName: string,
  prefixByColumn: string[],
|};

export default function Namespace({
  hasFeatureColumn,
  prefixByColumn,
  displayVisibilityByColumn,
  name,
  onToggleNamespace,
  overrideColorByColumn,
  topicName,
}: Props) {
  const dataSourceBadgeSlots = hasFeatureColumn ? 2 : 1;
  const [isHovering, setIsHovering] = useState(false);
  return (
    <SNamespace key={name} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <SName>{name}</SName>
      <SDataSourceBadgesWrapper dataSourceBadgeSlots={dataSourceBadgeSlots}>
        {displayVisibilityByColumn.map((item, columnIndex) => {
          if (!item) {
            return <SDataSourceBadgePlaceholder key={columnIndex} />;
          }
          const dataSourcePrefix = prefixByColumn[columnIndex];
          const { visible, available, badgeText, isParentVisible } = item;
          return (
            <DataSourceBadge
              available={available}
              badgeText={badgeText}
              dataTest={`namespace-${dataSourcePrefix}${topicName}:${name}`}
              highlighted={isHovering}
              dataSourcePrefixes={prefixByColumn}
              isNamespace
              isParentVisible={!!isParentVisible}
              key={columnIndex}
              overrideColor={overrideColorByColumn[columnIndex]}
              visible={visible}
              onToggleVisibility={() => {
                onToggleNamespace({ visible: !visible, columnIndex, namespace: name });
              }}
            />
          );
        })}
      </SDataSourceBadgesWrapper>
    </SNamespace>
  );
}
