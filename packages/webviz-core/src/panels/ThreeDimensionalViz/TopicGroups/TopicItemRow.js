// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useMemo, useCallback, useContext } from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

import Accordion from "./Accordion";
import Namespace from "./Namespace";
import { KeyboardContext } from "./TopicGroups";
import { toggleNamespace } from "./topicGroupsVisibilityUtils";
import TopicItemRowHeader from "./TopicItemRowHeader";
import type { TopicItem, OnTopicGroupsChange } from "./types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

type StyleProps = {| available: boolean, visible: boolean |};
const SItemRow = styled.li`
  padding: 0;
  display: flex;
  flex-direction: column;
  color: ${({ available, visible }: StyleProps) => (available && visible ? colors.LIGHT1 : colors.DARK8)};
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
  const { setFocusIndex } = useContext(KeyboardContext);
  const {
    hasFeatureColumn,
    objectPath,
    onTopicGroupsChange,
    item: {
      expanded: topicExpanded,
      settingsByColumn = [undefined, undefined],
      topicName,
      selectedNamespacesByColumn,
      derivedFields: {
        availableNamespacesByColumn,
        displayVisibilityByColumn,
        filterText,
        prefixByColumn,
        sortedNamespaceDisplayVisibilityByColumn,
      },
    },
  } = props;
  const namespacesMatchedSearch = !!filterText && !!sortedNamespaceDisplayVisibilityByColumn?.length;

  const overrideColorByColumn = useMemo(
    (): (?string)[] =>
      settingsByColumn.map((settings) => {
        if (settings) {
          const rgba = settings.overrideColor || { r: 1, g: 1, b: 1, a: 1 };
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

  const available = !!displayVisibilityByColumn;
  const visible = displayVisibilityByColumn && displayVisibilityByColumn.some((displayItem) => displayItem?.visible);

  return (
    <SItemRow hasNamespaces={!!sortedNamespaceDisplayVisibilityByColumn} available={available} visible={visible}>
      {sortedNamespaceDisplayVisibilityByColumn ? (
        <Accordion
          active={topicExpanded || namespacesMatchedSearch}
          onToggle={onToggleExpand}
          renderHeader={({ onToggle }) => (
            <TopicItemRowHeader
              {...props}
              setFocusIndex={setFocusIndex}
              hasNamespaces
              onToggleExpand={onToggle}
              overrideColorByColumn={overrideColorByColumn}
            />
          )}>
          <>
            {(topicExpanded || namespacesMatchedSearch) && (
              <SNamespacesBySource>
                {sortedNamespaceDisplayVisibilityByColumn.map((nsItem) => {
                  return (
                    <Namespace
                      {...nsItem}
                      setFocusIndex={setFocusIndex}
                      filterText={filterText}
                      key={nsItem.namespace}
                      hasFeatureColumn={hasFeatureColumn}
                      prefixByColumn={prefixByColumn}
                      overrideColorByColumn={overrideColorByColumn}
                      topicName={topicName}
                      onToggleNamespace={({ namespace, columnIndex }) => {
                        onTopicGroupsChange(
                          `${objectPath}.selectedNamespacesByColumn`,
                          toggleNamespace(
                            selectedNamespacesByColumn || [undefined, undefined],
                            availableNamespacesByColumn || [[], []],
                            namespace,
                            columnIndex
                          )
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
        <TopicItemRowHeader {...props} setFocusIndex={setFocusIndex} overrideColorByColumn={overrideColorByColumn} />
      )}
    </SItemRow>
  );
}
