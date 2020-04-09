// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import { ITEM_MAIN_PADDING_LEFT, ICON_PADDING, DATA_SOURCE_BADGE_SIZE, ICON_SIZE } from "./constants";
import DataSourceBadge from "./DataSourceBadge";
import KeyboardFocusIndex from "./KeyboardFocusIndex";
import TextHighlight from "./TextHighlight";
import { SDataSourceBadgesWrapper } from "./TopicItemRowHeader";
import type { NamespaceItem } from "./types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

type StyleProps = {| highlighted: boolean, filterText: string |};

const SNamespace = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* HACK[Audrey]: weird style issue, can not click data source badges, collapse arrow or topic names without a little transition time.
   * Might be related to the nested accordions' height change which happens after the accordion active state is set.
   */
  padding: 2px 28px 2px
    ${({ filterText }: StyleProps) =>
      filterText ? ITEM_MAIN_PADDING_LEFT - ICON_SIZE - ICON_PADDING : ITEM_MAIN_PADDING_LEFT}px;
  transition: 0.1s;
  background-color: ${({ highlighted }: StyleProps) => (highlighted ? colors.HOVER_BACKGROUND_COLOR : "unset")};
`;

const SName = styled.div`
  font-size: 13px;
  color: ${colors.LIGHT2};
  flex: 1;
  word-break: break-all;
`;

export const SDataSourceBadgePlaceholder = styled.div`
  width: ${DATA_SOURCE_BADGE_SIZE}px;
  height: ${DATA_SOURCE_BADGE_SIZE}px;
`;
type Props = {|
  ...NamespaceItem,
  filterText: string,
  hasFeatureColumn: boolean,
  onToggleNamespace: ({| columnIndex: number, namespace: string |}) => void,
  overrideColorByColumn: (?string)[],
  setFocusIndex: (number) => void,
  topicName: string,
  prefixByColumn: string[],
|};

export default function Namespace({
  displayVisibilityByColumn,
  filterText,
  hasFeatureColumn,
  isKeyboardFocused,
  keyboardFocusIndex,
  namespace,
  onToggleNamespace,
  overrideColorByColumn,
  prefixByColumn,
  setFocusIndex,
  topicName,
}: Props) {
  const dataSourceBadgeSlots = hasFeatureColumn ? 2 : 1;
  return (
    <SNamespace
      className={`focus-item-${keyboardFocusIndex}`}
      filterText={filterText}
      role="option"
      highlighted={isKeyboardFocused}
      onMouseEnter={() => {
        if (!isKeyboardFocused) {
          setFocusIndex(keyboardFocusIndex);
        }
      }}>
      <KeyboardFocusIndex highlighted={!!isKeyboardFocused} keyboardFocusIndex={keyboardFocusIndex} />
      {filterText ? <TextHighlight targetStr={namespace} searchText={filterText} /> : <SName>{namespace}</SName>}
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
              dataTest={`namespace-${dataSourcePrefix}${topicName}:${namespace}`}
              highlighted={!!isKeyboardFocused}
              dataSourcePrefixes={prefixByColumn}
              isNamespace
              isParentVisible={!!isParentVisible}
              key={columnIndex}
              overrideColor={overrideColorByColumn[columnIndex]}
              visible={visible}
              onToggleVisibility={() => {
                onToggleNamespace({ columnIndex, namespace });
              }}
            />
          );
        })}
      </SDataSourceBadgesWrapper>
    </SNamespace>
  );
}
