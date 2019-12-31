// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ChevronDownIcon from "@mdi/svg/svg/chevron-down.svg";
import ChevronUpIcon from "@mdi/svg/svg/chevron-up.svg";
import Collapse from "rc-collapse";
import React, { useCallback } from "react";
import styled, { css } from "styled-components";

import DataSourceBadge from "./DataSourceBadge";
import Namespaces from "./Namespaces";
import { SMenuWrapper } from "./TopicGroupMenu";
import TopicItemMenu from "./TopicItemMenu";
import type { TopicItem, OnTopicGroupsChange } from "./types";
import Icon from "webviz-core/src/components/Icon";
import { colors } from "webviz-core/src/util/colors";

const namespaceCss = css`
  .rc-collapse {
    .rc-collapse-item {
      .rc-collapse-header {
        padding: 0px 0px 0px 24px !important;
      }
    }
  }
`;
const SItemRow = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  color: ${(props) => (props.available ? colors.LIGHT1 : colors.TEXT_MUTED)};
  ${(props) => (props.hasNamespaces ? namespaceCss : "")};
  &:hover {
    color: ${colors.LIGHT};
  }
`;

const SItemMain = styled.div`
  display: flex;
  flex: 1;
  line-height: 1.2;
  padding: ${(props) => (props.hasNamespaces ? "8px 0 8px 8px" : " 8px 0px 8px 48px")};
  transition: 0.3s;
  &:hover {
    background-color: ${colors.HOVER_BACKGROUND_COLOR};
    ${SMenuWrapper} {
      color: white;
      opacity: 1;
    }
  }
`;

const SItemMainLeft = styled.div`
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
  font-size: 14px;
  margin-bottom: 4px;
  word-break: break-word;
`;

export const STopicName = styled.div`
  font-size: 10px;
  word-break: break-word;
`;

type Props = {|
  item: TopicItem,
  objectPath: string,
  onTopicGroupsChange: OnTopicGroupsChange,
|};

function TopicItemRowHeader({
  hasNamespaces,
  item,
  objectPath,
  onTopicGroupsChange,
  item: {
    topicName,
    derivedFields: { displayName, namespaceItems, displayVisibilityBySource },
  },
}: {|
  ...Props,
  hasNamespaces?: boolean,
|}) {
  return (
    <SItemMain hasNamespaces={hasNamespaces}>
      <SItemMainLeft>
        <SDisplayName>{displayName}</SDisplayName>
        {topicName !== displayName && <STopicName>{topicName}</STopicName>}
      </SItemMainLeft>
      <SItemMainRight>
        {Object.keys(displayVisibilityBySource).map((dataSourcePrefix) => {
          const { visible, available, badgeText, isParentVisible } = displayVisibilityBySource[dataSourcePrefix];
          return (
            <DataSourceBadge
              available={available}
              badgeText={badgeText}
              dataTest={`topic-${dataSourcePrefix}${topicName}`}
              isParentVisible={isParentVisible}
              key={dataSourcePrefix}
              visible={visible}
              onToggleVisibility={() => {
                onTopicGroupsChange(
                  `${objectPath}.visibilitiesBySource.${dataSourcePrefix}`,
                  !displayVisibilityBySource[dataSourcePrefix].visible
                );
              }}
            />
          );
        })}
        <TopicItemMenu item={item} objectPath={objectPath} onTopicGroupsChange={onTopicGroupsChange} />
      </SItemMainRight>
    </SItemMain>
  );
}

export default function TopicItemRow(props: Props) {
  const {
    objectPath,
    onTopicGroupsChange,
    item,
    item: {
      expanded: topicExpanded,
      topicName,
      derivedFields: { namespaceItems, id, available },
    },
  } = props;

  const hasNamespaces = namespaceItems.length > 0;
  const onCollapseChange = useCallback(
    (activeKeys) => {
      if (hasNamespaces) {
        onTopicGroupsChange(`${objectPath}.expanded`, !topicExpanded);
      }
    },
    [hasNamespaces, objectPath, onTopicGroupsChange, topicExpanded]
  );

  return (
    <SItemRow hasNamespaces={hasNamespaces} available={available}>
      {namespaceItems.length ? (
        <Collapse
          defaultActiveKey={topicExpanded ? id : null}
          onChange={onCollapseChange}
          expandIcon={({ expanded }) => (
            <Icon small fade>
              {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Icon>
          )}>
          <Collapse.Panel key={id} className={`test-${id}`} header={<TopicItemRowHeader hasNamespaces {...props} />}>
            <Namespaces
              onToggleNamespace={({ visible, namespace, dataSourcePrefix }) => {
                let newNamespaces =
                  (item.selectedNamespacesBySource && item.selectedNamespacesBySource[dataSourcePrefix]) || [];
                newNamespaces = visible
                  ? [...newNamespaces, namespace]
                  : newNamespaces.filter((ns) => ns !== namespace);
                onTopicGroupsChange(`${objectPath}.selectedNamespacesBySource.${dataSourcePrefix}`, newNamespaces);
              }}
              topicName={topicName}
              namespaceItems={namespaceItems}
            />
          </Collapse.Panel>
        </Collapse>
      ) : (
        <TopicItemRowHeader {...props} />
      )}
    </SItemRow>
  );
}
