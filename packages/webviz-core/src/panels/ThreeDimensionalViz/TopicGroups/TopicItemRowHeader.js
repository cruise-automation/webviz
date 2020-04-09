// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import AlertCircleIcon from "@mdi/svg/svg/alert-circle.svg";
import React, { useCallback } from "react";
import styled from "styled-components";

import { ExpandIcon } from "./Accordion";
import { DATA_SOURCE_BADGE_SIZE, ICON_TOTAL_SIZE } from "./constants";
import DataSourceBadge from "./DataSourceBadge";
import DatatypeIcon from "./DatatypeIcon";
import DragHandle from "./DragHandle";
import EditableTopicNameDisplay from "./EditableTopicNameDisplay";
import KeyboardFocusIndex from "./KeyboardFocusIndex";
import { SDataSourceBadgePlaceholder } from "./Namespace";
import { toggleAllForTopicVisibility } from "./topicGroupsVisibilityUtils";
import TopicItemMenu from "./TopicItemMenu";
import type { TopicItem, OnTopicGroupsChange } from "./types";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SItemMain = styled.div`
  position: relative;
  padding: 4px;
  display: flex;
  align-items: center;
  flex: 1;
  line-height: 1.2;
  /* HACK[Audrey]: weird style issue, can not click data source badges, collapse arrow or topic names without a little transition time.
   * Might be related to the nested accordions' height change which happens after the accordion active state is set.
   */
  transition: 0.1s;
  color: ${({ highlighted }) => (highlighted ? colors.LIGHT : "unset")};
  background-color: ${({ highlighted }) => (highlighted ? colors.HOVER_BACKGROUND_COLOR : "unset")};
`;

const SItemMainLeft = styled.div`
  font-size: 10px;
  padding-left: 4px;
  flex: 1;
  display: flex;
`;

export const SIconWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  width: ${ICON_TOTAL_SIZE}px;
  height: ${ICON_TOTAL_SIZE}px;
  position: relative;
`;

const SSettingChanged = styled.div`
  position: absolute;
  top: 0px;
  right: 0px;
  width: 8px;
  height: 8px;
  background: ${colors.HIGHLIGHT};
  border-radius: 4px;
`;

const SItemMainRight = styled.div`
  min-width: 84px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
`;

type SDataSourceBadgesWrapperProps = {|
  dataSourceBadgeSlots: number,
  paddingLeft: number,
|};

export const SDataSourceBadgesWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  width: ${({ dataSourceBadgeSlots }: SDataSourceBadgesWrapperProps) =>
    `${dataSourceBadgeSlots * DATA_SOURCE_BADGE_SIZE}px`};
  padding-left: ${({ paddingLeft }: SDataSourceBadgesWrapperProps) => `${paddingLeft}px`};
`;

const SErrorList = styled.ul`
  color: ${colors.RED};
  max-width: 360px;
  word-wrap: break-word;
  padding-left: 16px;
`;

const SErrorItem = styled.li`
  list-style: outside;
`;

type Props = {|
  dataTestShowErrors: boolean,
  hasFeatureColumn: boolean,
  hasNamespaces?: boolean,
  item: TopicItem,
  objectPath: string,
  onOpenEditTopicSettingsModal: (objectPath: string) => void,
  onToggleExpand?: () => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  overrideColorByColumn: (?string)[],
  setFocusIndex: (number) => void,
|};

export default function TopicItemRowHeader({
  hasFeatureColumn,
  hasNamespaces,
  item,
  objectPath,
  onOpenEditTopicSettingsModal,
  onTopicGroupsChange,
  overrideColorByColumn,
  onToggleExpand,
  setFocusIndex,
  item: {
    expanded,
    topicName,
    settingsByColumn,
    derivedFields: {
      id,
      prefixByColumn,
      datatype,
      displayName,
      displayVisibilityByColumn,
      errors,
      filterText,
      isKeyboardFocused,
      keyboardFocusIndex,
      sortedNamespaceDisplayVisibilityByColumn,
    },
  },
  dataTestShowErrors,
}: Props) {
  const onlyHighlightTopic = !!(filterText && filterText.startsWith("/"));

  const onChangeDisplayName = useCallback(
    (newDisplayName: string) => {
      onTopicGroupsChange(`${objectPath}.displayName`, newDisplayName);
    },
    [objectPath, onTopicGroupsChange]
  );

  const dataSourceBadgeSlots = hasFeatureColumn ? 2 : 1;
  return (
    <SItemMain
      className={`focus-item-${keyboardFocusIndex}`}
      role="option"
      aria-selected={isKeyboardFocused}
      hasNamespaces={hasNamespaces}
      highlighted={isKeyboardFocused}
      onMouseEnter={() => {
        if (!isKeyboardFocused) {
          setFocusIndex(keyboardFocusIndex);
        }
      }}
      data-test={`topic-row-${topicName}`}>
      <KeyboardFocusIndex highlighted={!!isKeyboardFocused} keyboardFocusIndex={keyboardFocusIndex} />
      <SIconWrapper>
        <DragHandle hasNamespaces={hasNamespaces} highlighted={isKeyboardFocused} />
      </SIconWrapper>
      <SIconWrapper>
        {errors && (
          <Icon
            style={{ color: colors.RED }}
            small
            tooltipProps={{ defaultShown: dataTestShowErrors, placement: "right" }}
            tooltip={
              <SErrorList>
                {errors.map((errStr) => (
                  <SErrorItem key={errStr}>{errStr}</SErrorItem>
                ))}
              </SErrorList>
            }
            onClick={(e) => e.stopPropagation()}>
            <AlertCircleIcon />
          </Icon>
        )}
      </SIconWrapper>
      {!filterText && (
        <SIconWrapper>
          {hasNamespaces && onToggleExpand && (
            <ExpandIcon dataTest={`test-toggle-expand-icon-${id}`} active={!!expanded} onToggle={onToggleExpand} />
          )}
        </SIconWrapper>
      )}
      <SIconWrapper style={{ marginRight: 4 }}>
        <DatatypeIcon datatype={datatype} />
        {settingsByColumn && (
          <Tooltip contents="Topic settings has changed">
            <SSettingChanged />
          </Tooltip>
        )}
      </SIconWrapper>
      <SItemMainLeft>
        <EditableTopicNameDisplay
          onClick={() => {
            if (onToggleExpand) {
              onToggleExpand();
            }
            setFocusIndex(keyboardFocusIndex);
          }}
          onChangeDisplayName={onChangeDisplayName}
          displayName={displayName}
          topicName={topicName}
          searchText={filterText}
          onlyHighlightTopic={onlyHighlightTopic}
          isKeyboardFocused={isKeyboardFocused}
        />
      </SItemMainLeft>
      <SItemMainRight>
        {displayVisibilityByColumn && (
          <SDataSourceBadgesWrapper dataSourceBadgeSlots={dataSourceBadgeSlots}>
            {displayVisibilityByColumn.map((displayVisibilityItem, columnIndex) => {
              if (!displayVisibilityItem) {
                return <SDataSourceBadgePlaceholder key={columnIndex} />;
              }
              const { visible, available, badgeText, isParentVisible } = displayVisibilityItem;
              const dataSourcePrefix = prefixByColumn[columnIndex];
              return (
                <DataSourceBadge
                  available={available}
                  badgeText={badgeText}
                  dataTest={`topic-${dataSourcePrefix}${topicName}`}
                  dataSourcePrefixes={[dataSourcePrefix]}
                  isParentVisible={isParentVisible}
                  highlighted={!!isKeyboardFocused}
                  key={dataSourcePrefix}
                  visible={visible}
                  overrideColor={overrideColorByColumn[columnIndex]}
                  topicName={`${dataSourcePrefix}${topicName}`}
                  onToggleVisibility={() => {
                    onTopicGroupsChange(
                      `${objectPath}.visibilityByColumn[${columnIndex}]`,
                      !displayVisibilityByColumn[columnIndex]?.visible
                    );
                  }}
                  {...(sortedNamespaceDisplayVisibilityByColumn
                    ? {
                        onToggleAllVisibilities: () => {
                          const newItem = toggleAllForTopicVisibility(item, columnIndex);
                          onTopicGroupsChange(objectPath, newItem);
                        },
                      }
                    : undefined)}
                />
              );
            })}
          </SDataSourceBadgesWrapper>
        )}
        <TopicItemMenu
          highlighted={!!isKeyboardFocused}
          item={item}
          objectPath={objectPath}
          onOpenEditTopicSettingsModal={onOpenEditTopicSettingsModal}
          onTopicGroupsChange={onTopicGroupsChange}
        />
      </SItemMainRight>
    </SItemMain>
  );
}
