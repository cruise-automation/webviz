// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mapValues } from "lodash";
import React, { useMemo } from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

import Accordion from "./Accordion";
import Namespace from "./Namespace";
import TopicItemRowHeader from "./TopicItemRowHeader";
import { parseColorSetting } from "./TopicSettingsEditor";
import type { TopicItem, OnTopicGroupsChange } from "./types";
import { colors } from "webviz-core/src/util/colors";

const SItemRow = styled.li`
  padding: 0;
  display: flex;
  flex-direction: column;
  color: ${(props: { available: boolean }) => (props.available ? colors.LIGHT1 : colors.TEXT_MUTED)};
  &:hover {
    color: ${colors.LIGHT};
  }
`;

const SNamespacesBySource = styled.div`
  margin-bottom: 8px;
`;

type Props = {|
  item: TopicItem,
  objectPath: string,
  onOpenEditTopicSettingsModal: (objectPath: string) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  dataTestShowErrors: boolean,
|};

export default function TopicItemRow(props: Props) {
  const {
    objectPath,
    onTopicGroupsChange,
    item,
    item: {
      expanded: topicExpanded,
      settingsBySource,
      topicName,
      derivedFields: { namespaceItems, availablePrefixes, dataSourceBadgeSlots, isBaseNamespaceAvailable },
    },
  } = props;

  const hasNamespaces = namespaceItems.length > 0;

  const overrideColorBySource = useMemo(
    () =>
      mapValues(settingsBySource, (settings) => {
        const rgba = parseColorSetting(settings.overrideColor, 1);
        return tinyColor.fromRatio(rgba).toRgbString();
      }),
    [settingsBySource]
  );

  return (
    <SItemRow hasNamespaces={hasNamespaces} available={availablePrefixes.length > 0}>
      {namespaceItems.length ? (
        <Accordion
          defaultActive={topicExpanded}
          renderHeader={({ onToggle }) => (
            <TopicItemRowHeader
              {...props}
              hasNamespaces
              onToggleExpand={() => {
                onToggle();
                if (hasNamespaces) {
                  onTopicGroupsChange(`${objectPath}.expanded`, !topicExpanded);
                }
              }}
              overrideColorBySource={overrideColorBySource}
            />
          )}>
          <>
            {topicExpanded && (
              <SNamespacesBySource>
                {namespaceItems.map((nsItem) => (
                  <Namespace
                    key={nsItem.name}
                    {...nsItem}
                    overrideColorBySource={overrideColorBySource}
                    dataSourceBadgeSlots={dataSourceBadgeSlots}
                    isBaseNamespaceAvailable={isBaseNamespaceAvailable}
                    topicName={topicName}
                    onToggleNamespace={({ visible, namespace, dataSourcePrefix }) => {
                      let newNamespaces =
                        (item.selectedNamespacesBySource && item.selectedNamespacesBySource[dataSourcePrefix]) || [];
                      newNamespaces = visible
                        ? [...newNamespaces, namespace]
                        : newNamespaces.filter((ns) => ns !== namespace);
                      onTopicGroupsChange(
                        `${objectPath}.selectedNamespacesBySource.${dataSourcePrefix}`,
                        newNamespaces
                      );
                    }}
                  />
                ))}
              </SNamespacesBySource>
            )}
          </>
        </Accordion>
      ) : (
        <TopicItemRowHeader {...props} overrideColorBySource={overrideColorBySource} />
      )}
    </SItemRow>
  );
}
