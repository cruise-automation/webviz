// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import AlertCircleIcon from "@mdi/svg/svg/alert-circle.svg";
import LeadPencilIcon from "@mdi/svg/svg/lead-pencil.svg";
import * as React from "react";
import styled from "styled-components";

import NodeName from "./NodeName";
import { TREE_SPACING } from "./TopicTree";
import TreeNodeDotMenu, { DOT_MENU_WIDTH } from "./TreeNodeDotMenu";
import type { TreeNode, ToggleNode, ToggleNodeByColumn, DerivedCustomSettings, SetCurrentEditingTopic } from "./types";
import VisibilityToggle, { TOGGLE_WRAPPER_SIZE, TOPIC_ROW_PADDING } from "./VisibilityToggle";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";
import { canEditDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const ICON_SIZE = 22;
const MAX_GROUP_ERROR_WIDTH = 64;
export const ROW_CONTENT_HEIGHT = 24;

export const ROW_HEIGHT = 30;

export const STreeNodeRow = styled.div`
  color: ${(props: { visibleInScene: boolean }) => (props.visibleInScene ? "unset" : colors.TEXT_MUTED)};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const SLeft = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-height: ${TOGGLE_WRAPPER_SIZE}px;
  padding: ${TOPIC_ROW_PADDING}px 0px;
`;

const SErrorCount = styled.small`
  color: ${colors.RED};
  width: ${MAX_GROUP_ERROR_WIDTH}px;
`;

const SIconWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${ICON_SIZE}px;
  height: ${ICON_SIZE}px;
`;

const SErrorList = styled.ul`
  max-width: 240px;
  word-wrap: break-word;
  padding-left: 16px;
`;

const SErrorItem = styled.li`
  list-style: outside;
`;

export const SRightActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

export const SToggles = styled.div`
  display: flex;
  align-items: center;
`;

export const SDotMenuPlaceholder = styled.span`
  width: ${DOT_MENU_WIDTH}px;
  height: ${ROW_HEIGHT}px;
`;

type Props = {|
  checkedKeysSet: Set<string>,
  hasChildren: boolean,
  hasFeatureColumn: boolean,
  isXSWidth: boolean,
  node: TreeNode,
  nodeVisibleInScene: boolean,
  visibleByColumn: (?boolean)[],
  toggleCheckAllAncestors: ToggleNodeByColumn,
  toggleCheckAllDescendants: ToggleNodeByColumn,
  toggleNodeChecked: ToggleNodeByColumn,
  toggleNodeExpanded: ToggleNode,
  sceneErrors: ?(string[]),
  setCurrentEditingTopic: SetCurrentEditingTopic,
  derivedCustomSettings: ?DerivedCustomSettings,
  width: number,
  filterText: string,
  tooltips?: React.Node[],
|};

export default function TreeNodeRow({
  checkedKeysSet,
  hasChildren,
  hasFeatureColumn,
  isXSWidth,
  node,
  node: { availableByColumn, providerAvailable, name, key, featureKey },
  nodeVisibleInScene,
  visibleByColumn,
  toggleCheckAllAncestors,
  toggleCheckAllDescendants,
  toggleNodeChecked,
  toggleNodeExpanded,
  sceneErrors,
  setCurrentEditingTopic,
  derivedCustomSettings,
  width,
  filterText,
  tooltips,
}: Props) {
  const topicName = node.type === "topic" ? node.topicName : "";
  const datatype = node.type === "topic" ? node.datatype : undefined;

  const isDefaultSettings = derivedCustomSettings?.isDefaultSettings || !derivedCustomSettings;
  const showTopicSettings = topicName && datatype && canEditDatatype(datatype);
  const showTopicSettingsChanged = showTopicSettings && !isDefaultSettings;

  const showTopicError = node.type === "topic" && sceneErrors && sceneErrors.length > 0;
  const showGroupError = node.type === "group" && sceneErrors && sceneErrors.length > 0;

  const rowWidth = width - (isXSWidth ? 0 : TREE_SPACING * 2);

  const togglesWidth = hasFeatureColumn ? TOGGLE_WRAPPER_SIZE * 2 : TOGGLE_WRAPPER_SIZE;
  const rightActionWidth = providerAvailable ? togglesWidth + DOT_MENU_WIDTH : DOT_MENU_WIDTH;
  // -8px to add some spacing between the name and right action area.
  let maxNodeNameWidth = rowWidth - rightActionWidth - 8;

  if (showTopicSettingsChanged) {
    maxNodeNameWidth -= ICON_SIZE;
  }
  if (showGroupError) {
    maxNodeNameWidth -= MAX_GROUP_ERROR_WIDTH;
  }
  if (showTopicError) {
    maxNodeNameWidth -= ICON_SIZE;
  }

  const errorTooltip = sceneErrors && (
    <SErrorList>
      {sceneErrors.map((errStr) => (
        <SErrorItem key={errStr}>{errStr}</SErrorItem>
      ))}
    </SErrorList>
  );

  return (
    <STreeNodeRow visibleInScene={nodeVisibleInScene} style={{ width: rowWidth }}>
      <SLeft
        style={{ cursor: hasChildren && !filterText ? "pointer" : "default" }}
        data-test={`name~${key}`}
        onClick={hasChildren ? () => toggleNodeExpanded(key) : undefined}>
        <NodeName
          isXSWidth={isXSWidth}
          maxWidth={maxNodeNameWidth}
          displayName={name || topicName}
          tooltips={tooltips}
          topicName={topicName}
          searchText={filterText}
        />
        {showTopicSettingsChanged && datatype && (
          <Icon
            style={{ padding: "0 4px", color: colors.HIGHLIGHT }}
            fade
            tooltip="Topic settings edited"
            onClick={() => setCurrentEditingTopic({ name: topicName, datatype })}>
            <LeadPencilIcon />
          </Icon>
        )}
        {showGroupError && errorTooltip && sceneErrors && (
          <Tooltip contents={errorTooltip} placement="top">
            <SErrorCount>{`${sceneErrors.length} ${sceneErrors.length === 1 ? "error" : "errors"}`}</SErrorCount>
          </Tooltip>
        )}
        {showTopicError && errorTooltip && (
          <SIconWrapper>
            <Icon
              style={{ color: colors.RED, fontSize: 14, display: "inline-flex", alignItems: "center" }}
              small
              tooltipProps={{ placement: "top" }}
              tooltip={errorTooltip}
              onClick={(e) => e.stopPropagation()}>
              <AlertCircleIcon />
            </Icon>
          </SIconWrapper>
        )}
      </SLeft>

      <SRightActions>
        {providerAvailable && (
          <SToggles>
            {availableByColumn.map((available, columnIdx) => (
              <VisibilityToggle
                available={available}
                dataTest={`visibility-toggle~${key}~column${columnIdx}`}
                key={columnIdx}
                overrideColor={(derivedCustomSettings?.overrideColorByColumn || [])[columnIdx]}
                checked={checkedKeysSet.has(columnIdx === 1 ? featureKey : key)}
                onToggle={() => toggleNodeChecked(key, columnIdx)}
                onShiftToggle={() => toggleCheckAllDescendants(key, columnIdx)}
                onAltToggle={() => toggleCheckAllAncestors(key, columnIdx)}
                unavailableTooltip={
                  node.type === "group" ? "None of the topics in this group are currently available" : "Unavailable"
                }
                visibleInScene={!!visibleByColumn[columnIdx]}
              />
            ))}
          </SToggles>
        )}
        <TreeNodeDotMenu
          datatype={showTopicSettings ? datatype : undefined}
          disableBaseColumn={!availableByColumn[0]}
          disableFeatureColumn={!availableByColumn[1]}
          hasFeatureColumn={hasFeatureColumn && availableByColumn[1]}
          nodeKey={key}
          setCurrentEditingTopic={setCurrentEditingTopic}
          toggleCheckAllAncestors={toggleCheckAllAncestors}
          toggleCheckAllDescendants={toggleCheckAllDescendants}
          topicName={topicName}
        />
      </SRightActions>
    </STreeNodeRow>
  );
}
