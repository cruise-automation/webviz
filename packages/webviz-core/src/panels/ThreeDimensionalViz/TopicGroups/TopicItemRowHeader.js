// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import AlertCircleIcon from "@mdi/svg/svg/alert-circle.svg";
import TBoxIcon from "@mdi/svg/svg/alpha-t-box.svg";
import React, { useState } from "react";
import styled from "styled-components";

import { ExpandIcon } from "./Accordion";
import { DATA_SOURCE_BADGE_SIZE, ICON_TOTAL_SIZE } from "./constants";
import DataSourceBadge from "./DataSourceBadge";
import DragHandle, { SDragHandle } from "./DragHandle";
import { SMenuWrapper } from "./TopicGroupMenu";
import TopicItemMenu from "./TopicItemMenu";
import TopicNameDisplay from "./TopicNameDisplay";
import type { OverrideColorBySource, TopicItem, OnTopicGroupsChange } from "./types";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { colors } from "webviz-core/src/util/colors";

const ICON_BY_DATATYPE = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.iconsByDatatype;

const SItemMain = styled.div`
  padding: 4px;
  display: flex;
  align-items: center;
  flex: 1;
  line-height: 1.2;
  transition: 0.3s;
  &:hover {
    background-color: ${colors.HOVER_BACKGROUND_COLOR};
    ${SMenuWrapper} {
      color: white;
      opacity: 1;
    }
    ${SDragHandle} {
      color: white;
      opacity: 1;
    }
  }
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
  hasNamespaces?: boolean,
  item: TopicItem,
  objectPath: string,
  onOpenEditTopicSettingsModal: (objectPath: string) => void,
  onToggleExpand?: () => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  overrideColorBySource: OverrideColorBySource,
|};

export default function TopicItemRowHeader({
  hasNamespaces,
  item,
  objectPath,
  onOpenEditTopicSettingsModal,
  onTopicGroupsChange,
  overrideColorBySource,
  onToggleExpand,
  item: {
    expanded,
    topicName,
    settingsBySource,
    derivedFields: {
      id,
      dataSourceBadgeSlots,
      datatype,
      displayName,
      displayVisibilityBySource,
      errors,
      filterText,
      isBaseTopicAvailable,
      namespaceItems,
    },
  },
  dataTestShowErrors,
}: Props) {
  const [isHovering, setIsHovering] = useState(false);
  const TopicIcon = (datatype && ICON_BY_DATATYPE[datatype]) || TBoxIcon;
  const onlyHighlightTopic = !!(filterText && filterText.startsWith("/"));

  return (
    <SItemMain
      hasNamespaces={hasNamespaces}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}>
      <SIconWrapper>
        <DragHandle hasNamespaces={hasNamespaces} />
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
      <SIconWrapper>
        {hasNamespaces && onToggleExpand && (
          <ExpandIcon dataTest={`test-toggle-expand-icon-${id}`} active={!!expanded} onToggle={onToggleExpand} />
        )}
      </SIconWrapper>
      <SIconWrapper style={{ marginRight: 4 }}>
        <Icon fade small style={{ cursor: "unset" }} clickable={!!datatype}>
          <TopicIcon />
        </Icon>
        {settingsBySource && (
          <Tooltip contents="Topic settings has changed">
            <SSettingChanged />
          </Tooltip>
        )}
      </SIconWrapper>
      <SItemMainLeft>
        <TopicNameDisplay
          displayName={displayName}
          topicName={topicName}
          searchText={filterText}
          onlyHighlightTopic={onlyHighlightTopic}
        />
      </SItemMainLeft>
      <SItemMainRight>
        <SDataSourceBadgesWrapper
          dataSourceBadgeSlots={dataSourceBadgeSlots}
          paddingLeft={
            !isBaseTopicAvailable && Object.keys(displayVisibilityBySource).length < dataSourceBadgeSlots
              ? DATA_SOURCE_BADGE_SIZE
              : 0
          }>
          {Object.keys(displayVisibilityBySource).map((dataSourcePrefix) => {
            const { visible, available, badgeText, isParentVisible } = displayVisibilityBySource[dataSourcePrefix];
            return (
              <DataSourceBadge
                available={available}
                badgeText={badgeText}
                dataTest={`topic-${dataSourcePrefix}${topicName}`}
                isParentVisible={isParentVisible}
                isHovering={isHovering}
                key={dataSourcePrefix}
                visible={visible}
                overrideColor={overrideColorBySource[dataSourcePrefix]}
                onToggleVisibility={() => {
                  onTopicGroupsChange(
                    `${objectPath}.visibilityBySource.${dataSourcePrefix}`,
                    !displayVisibilityBySource[dataSourcePrefix].visible
                  );
                }}
              />
            );
          })}
        </SDataSourceBadgesWrapper>
        <TopicItemMenu
          item={item}
          objectPath={objectPath}
          onOpenEditTopicSettingsModal={onOpenEditTopicSettingsModal}
          onTopicGroupsChange={onTopicGroupsChange}
        />
      </SItemMainRight>
    </SItemMain>
  );
}
