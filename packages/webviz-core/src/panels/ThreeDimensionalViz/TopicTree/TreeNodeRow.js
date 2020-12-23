// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import AlertCircleIcon from "@mdi/svg/svg/alert-circle.svg";
import LeadPencilIcon from "@mdi/svg/svg/lead-pencil.svg";
import React, { type Node, useCallback, useContext, useMemo } from "react";
import styled from "styled-components";

import NodeName from "./NodeName";
import { TREE_SPACING } from "./TopicTree";
import TreeNodeMenu, { DOT_MENU_WIDTH } from "./TreeNodeMenu";
import type { DerivedCustomSettings, SetCurrentEditingTopic, TreeNode } from "./types";
import VisibilityToggle, { TOGGLE_WRAPPER_SIZE, TOPIC_ROW_PADDING } from "./VisibilityToggle";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";
import { ThreeDimensionalVizContext } from "webviz-core/src/panels/ThreeDimensionalViz/ThreeDimensionalVizContext";
import { canEditDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import { TopicTreeContext } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/useTopicTree";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import { useGuaranteedContext } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import { joinTopics } from "webviz-core/src/util/topicUtils";

export const ICON_SIZE = 22;
export const ROW_HEIGHT = 24;
const MAX_GROUP_ERROR_WIDTH = 64;
const VISIBLE_COUNT_WIDTH = 18;
const VISIBLE_COUNT_MARGIN = 4;

export const STreeNodeRow = styled.div`
  color: ${(props: { visibleInScene: boolean }) => (props.visibleInScene ? "unset" : colors.TEXT_MUTED)};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const SLeft = styled.div`
  display: flex;
  align-items: center;
  flex: 1 1 auto;
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

const SVisibleCount = styled.span`
  width: ${VISIBLE_COUNT_WIDTH}px;
  height: ${ROW_HEIGHT - 6}px;
  padding-top: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  margin: 0 ${VISIBLE_COUNT_MARGIN}px;
`;

type Props = {|
  checkedKeysSet: Set<string>,
  hasChildren: boolean,
  hasFeatureColumn: boolean,
  isXSWidth: boolean,
  node: TreeNode,
  nodeVisibleInScene: boolean,
  visibleByColumn: (?boolean)[],
  sceneErrors: ?(string[]),
  setCurrentEditingTopic: SetCurrentEditingTopic,
  derivedCustomSettings: ?DerivedCustomSettings,
  width: number,
  filterText: string,
  tooltips?: Node[],
  visibleTopicsCount: number,
  diffModeEnabled: boolean,
|};

export default function TreeNodeRow({
  checkedKeysSet,
  derivedCustomSettings,
  filterText,
  hasChildren,
  hasFeatureColumn,
  isXSWidth,
  node,
  node: { availableByColumn, providerAvailable, name, key, featureKey },
  nodeVisibleInScene,
  sceneErrors,
  setCurrentEditingTopic,
  tooltips,
  visibleByColumn,
  visibleTopicsCount,
  width,
  diffModeEnabled,
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

  const showVisibleTopicsCount = providerAvailable && node.type === "group" && node.children && visibleTopicsCount > 0;

  maxNodeNameWidth -= showVisibleTopicsCount ? VISIBLE_COUNT_WIDTH + VISIBLE_COUNT_MARGIN * 2 : 0;

  const { setHoveredMarkerMatchers } = useContext(ThreeDimensionalVizContext);
  const updateHoveredMarkerMatchers = useCallback((columnIndex, visible) => {
    if (visible) {
      const topic = [topicName, joinTopics(SECOND_SOURCE_PREFIX, topicName)][columnIndex];
      setHoveredMarkerMatchers([{ topic }]);
    }
  }, [setHoveredMarkerMatchers, topicName]);

  const onMouseLeave = useCallback(() => setHoveredMarkerMatchers([]), [setHoveredMarkerMatchers]);
  const mouseEventHandlersByColumnIdx = useMemo(() => {
    return new Array(2).fill().map((_, columnIndex) => ({
      onMouseEnter: () => updateHoveredMarkerMatchers(columnIndex, true),
      onMouseLeave,
    }));
  }, [onMouseLeave, updateHoveredMarkerMatchers]);
  const {
    toggleCheckAllAncestors,
    toggleNodeChecked,
    toggleNodeExpanded,
    toggleCheckAllDescendants,
  } = useGuaranteedContext(TopicTreeContext, "TopicTreeContext");

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
          {...(showVisibleTopicsCount
            ? {
                additionalElem: (
                  <Tooltip
                    placement="top"
                    contents={`${visibleTopicsCount} visible ${
                      visibleTopicsCount === 1 ? "topic" : "topics"
                    } in this group`}>
                    <SVisibleCount>{visibleTopicsCount}</SVisibleCount>
                  </Tooltip>
                ),
              }
            : undefined)}
        />
        {showTopicSettingsChanged && datatype && (
          <Icon
            style={{ padding: "0 4px", color: colors.HIGHLIGHT, lineHeight: 1 }}
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
            {availableByColumn.map((available, columnIdx) => {
              const checked = checkedKeysSet.has(columnIdx === 1 ? featureKey : key);
              return (
                <VisibilityToggle
                  available={available}
                  dataTest={`visibility-toggle~${key}~column${columnIdx}`}
                  key={columnIdx}
                  size={node.type === "topic" ? "SMALL" : "NORMAL"}
                  overrideColor={(derivedCustomSettings?.overrideColorByColumn || [])[columnIdx]}
                  checked={checked}
                  onToggle={() => {
                    toggleNodeChecked(key, columnIdx);
                    updateHoveredMarkerMatchers(columnIdx, !checked);
                  }}
                  onShiftToggle={() => {
                    toggleCheckAllDescendants(key, columnIdx);
                    updateHoveredMarkerMatchers(columnIdx, !checked);
                  }}
                  onAltToggle={() => {
                    toggleCheckAllAncestors(key, columnIdx);
                    updateHoveredMarkerMatchers(columnIdx, !checked);
                  }}
                  unavailableTooltip={
                    node.type === "group" ? "None of the topics in this group are currently available" : "Unavailable"
                  }
                  visibleInScene={!!visibleByColumn[columnIdx]}
                  {...mouseEventHandlersByColumnIdx[columnIdx]}
                  diffModeEnabled={diffModeEnabled}
                  columnIndex={columnIdx}
                />
              );
            })}
          </SToggles>
        )}
        <TreeNodeMenu
          datatype={showTopicSettings ? datatype : undefined}
          disableBaseColumn={diffModeEnabled || !availableByColumn[0]}
          disableFeatureColumn={diffModeEnabled || !availableByColumn[1]}
          hasFeatureColumn={hasFeatureColumn && availableByColumn[1]}
          nodeKey={key}
          providerAvailable={providerAvailable}
          setCurrentEditingTopic={setCurrentEditingTopic}
          topicName={topicName}
        />
      </SRightActions>
    </STreeNodeRow>
  );
}
