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
import TreeNodeMenu, { DOT_MENU_WIDTH } from "./TreeNodeMenu";
import type { DerivedCustomSettings, SetCurrentEditingTopic, TreeNode } from "./types";
import VisibilityToggle, { TOGGLE_WRAPPER_SIZE } from "./VisibilityToggle";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";
import { ThreeDimensionalVizContext } from "webviz-core/src/panels/ThreeDimensionalViz/ThreeDimensionalVizContext";
import { canEditDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import { useTopicTreeActions } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/useTopicTree";
import type { StructuralDatatypes } from "webviz-core/src/panels/ThreeDimensionalViz/utils/datatypes";
import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import { joinTopics } from "webviz-core/src/util/topicUtils";

export const ICON_SIZE = 22;
export const ROW_HEIGHT = 24;
const MAX_GROUP_ERROR_WIDTH = 64;
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
  flex: 1 1 0;
  min-width: 0;
  min-height: ${TOGGLE_WRAPPER_SIZE}px;
  overflow: hidden;
`;

const SErrorCount = styled.small`
  color: ${colors.RED};
  font-size: 10px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  width: ${MAX_GROUP_ERROR_WIDTH}px;
`;

const SIconWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${ICON_SIZE}px;
  flex: 0 0 auto;
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
  width: 18px;
  height: ${ROW_HEIGHT - 6}px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  margin: 0 ${VISIBLE_COUNT_MARGIN}px;
`;

const STopicSettingsIcon = styled(Icon)`
  padding: 0 4px;
  color: ${colors.HIGHLIGHT};
  line-height: 1;
  width: 22px;
  font-size: 11px;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
`;

const STopicErrorIcon = styled(Icon)`
  color: ${colors.RED};
  align-items: center;
  display: inline-flex;
  font-size: 14px;
`;

type Props = {|
  checkedKeysSet: Set<string>,
  hasChildren: boolean,
  hasFeatureColumn: boolean,
  node: TreeNode,
  nodeVisibleInScene: boolean,
  visibleByColumn: (?boolean)[],
  sceneErrors: ?(string[]),
  setCurrentEditingTopic: SetCurrentEditingTopic,
  structuralDatatypes: StructuralDatatypes,
  derivedCustomSettings: ?DerivedCustomSettings,
  filterText: string,
  tooltips?: Node[],
  visibleTopicsCount: number,
  diffModeEnabled: boolean,
|};

function TreeNodeRow({
  checkedKeysSet,
  derivedCustomSettings,
  filterText,
  hasChildren,
  hasFeatureColumn,
  node,
  node: { availableByColumn, providerAvailable, name, key, featureKey },
  nodeVisibleInScene,
  sceneErrors,
  setCurrentEditingTopic,
  structuralDatatypes,
  tooltips,
  visibleByColumn,
  visibleTopicsCount,
  diffModeEnabled,
}: Props) {
  const topicName = node.type === "topic" ? node.topicName : "";
  const datatype = node.type === "topic" ? node.datatype : undefined;

  const isDefaultSettings = derivedCustomSettings?.isDefaultSettings || !derivedCustomSettings;
  const showTopicSettings = topicName && datatype && canEditDatatype(datatype, structuralDatatypes);
  const showTopicSettingsChanged = showTopicSettings && !isDefaultSettings;

  const showTopicError = node.type === "topic" && sceneErrors && sceneErrors.length > 0;
  const showGroupError = node.type === "group" && sceneErrors && sceneErrors.length > 0;

  const errorTooltip = sceneErrors && (
    <SErrorList>
      {sceneErrors.map((errStr) => (
        <SErrorItem key={errStr}>{errStr}</SErrorItem>
      ))}
    </SErrorList>
  );

  const showVisibleTopicsCount = providerAvailable && node.type === "group" && node.children && visibleTopicsCount > 0;

  const { setHoveredMarkerMatchers } = useContext(ThreeDimensionalVizContext);
  const updateHoveredMarkerMatchers = useCallback((columnIndex, visible) => {
    if (visible) {
      const topic = [topicName, joinTopics($WEBVIZ_SOURCE_2, topicName)][columnIndex];
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
  } = useTopicTreeActions();

  return (
    <STreeNodeRow visibleInScene={nodeVisibleInScene}>
      <SLeft
        style={{ cursor: hasChildren && !filterText ? "pointer" : "default" }}
        data-test={`name~${key}`}
        onClick={hasChildren ? () => toggleNodeExpanded(key) : undefined}>
        <NodeName
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
          <STopicSettingsIcon
            fade
            tooltip="Edit Topic settings"
            onClick={() => setCurrentEditingTopic({ name: topicName, datatypeName: datatype })}>
            <LeadPencilIcon />
          </STopicSettingsIcon>
        )}
        {showGroupError && errorTooltip && sceneErrors && (
          <Tooltip contents={errorTooltip} placement="top">
            <SErrorCount>{`${sceneErrors.length} ${sceneErrors.length === 1 ? "error" : "errors"}`}</SErrorCount>
          </Tooltip>
        )}
        {showTopicError && errorTooltip && (
          <SIconWrapper>
            <STopicErrorIcon
              tooltipProps={{ placement: "top" }}
              tooltip={errorTooltip}
              onClick={(e) => e.stopPropagation()}>
              <AlertCircleIcon />
            </STopicErrorIcon>
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

export function TreeNodeRowSimple({ onToggle, tooltips, topicName, disabled, togglePropsByColumn }: any) {
  return (
    <STreeNodeRow visibleInScene={!disabled}>
      <SLeft>
        <NodeName displayName={topicName} tooltips={tooltips} topicName={topicName} searchText={""} />
      </SLeft>
      <SRightActions>
        <SToggles>
          {togglePropsByColumn.map(({ available, checked, enabled, topicName: topicNameWithSource }, columnIdx) => (
            <VisibilityToggle
              available={available}
              dataTest={`visibility-toggle~${topicNameWithSource}~column${columnIdx}`}
              key={topicNameWithSource}
              checked={checked}
              onToggle={() => onToggle(topicNameWithSource)}
              visibleInScene={enabled}
              columnIndex={columnIdx}
            />
          ))}
        </SToggles>
      </SRightActions>
    </STreeNodeRow>
  );
}

export default React.memo<Props>(TreeNodeRow);
