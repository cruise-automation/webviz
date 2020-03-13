// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useMemo, useCallback } from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

import Accordion from "./Accordion";
import Namespace from "./Namespace";
import TopicItemRowHeader from "./TopicItemRowHeader";
import { parseColorSetting } from "./TopicSettingsEditor";
import type { TopicItem, OnTopicGroupsChange } from "./types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

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
  hasFeatureColumn: boolean,
  item: TopicItem,
  objectPath: string,
  onOpenEditTopicSettingsModal: (objectPath: string) => void,
  onTopicGroupsChange: OnTopicGroupsChange,
  dataTestShowErrors: boolean,
|};

export default function TopicItemRow(props: Props) {
  const {
    hasFeatureColumn,
    objectPath,
    onTopicGroupsChange,
    item,
    item: {
      expanded: topicExpanded,
      settingsByColumn = [undefined, undefined],
      topicName,
      derivedFields: { prefixByColumn, namespaceDisplayVisibilityByNamespace, displayVisibilityByColumn },
    },
  } = props;

  const overrideColorByColumn = useMemo(
    (): (?string)[] =>
      settingsByColumn.map((settings) => {
        if (settings) {
          const rgba = parseColorSetting(settings.overrideColor, 1);
          return tinyColor.fromRatio(rgba).toRgbString();
        }
        return undefined;
      }),
    [settingsByColumn]
  );
  const onToggleExpand = useCallback(
    () => {
      // Always store the expanded states even when namespaces are not available.
      onTopicGroupsChange(`${objectPath}.expanded`, !topicExpanded);
    },
    [objectPath, onTopicGroupsChange, topicExpanded]
  );

  return (
    <SItemRow hasNamespaces={!!namespaceDisplayVisibilityByNamespace} available={!!displayVisibilityByColumn}>
      {namespaceDisplayVisibilityByNamespace ? (
        <Accordion
          active={topicExpanded}
          onToggle={onToggleExpand}
          renderHeader={({ onToggle }) => (
            <TopicItemRowHeader
              {...props}
              hasNamespaces
              onToggleExpand={onToggle}
              overrideColorByColumn={overrideColorByColumn}
            />
          )}>
          <>
            {topicExpanded && (
              <SNamespacesBySource>
                {Object.keys(namespaceDisplayVisibilityByNamespace)
                  .sort()
                  .map((ns) => {
                    const nsItem = namespaceDisplayVisibilityByNamespace[ns];
                    return (
                      <Namespace
                        key={ns}
                        hasFeatureColumn={hasFeatureColumn}
                        name={ns}
                        prefixByColumn={prefixByColumn}
                        displayVisibilityByColumn={nsItem}
                        overrideColorByColumn={overrideColorByColumn}
                        topicName={topicName}
                        onToggleNamespace={({ visible, namespace, columnIndex }) => {
                          let newNamespaces =
                            (item.selectedNamespacesByColumn && item.selectedNamespacesByColumn[columnIndex]) || [];
                          newNamespaces = visible
                            ? [...newNamespaces, namespace]
                            : newNamespaces.filter((name) => name !== namespace);
                          onTopicGroupsChange(
                            `${objectPath}.selectedNamespacesByColumn[${columnIndex}]`,
                            newNamespaces
                          );
                        }}
                      />
                    );
                  })}
              </SNamespacesBySource>
            )}
          </>
        </Accordion>
      ) : (
        <TopicItemRowHeader {...props} overrideColorByColumn={overrideColorByColumn} />
      )}
    </SItemRow>
  );
}
