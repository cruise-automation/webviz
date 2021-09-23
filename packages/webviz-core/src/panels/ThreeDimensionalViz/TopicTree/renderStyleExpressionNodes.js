// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import DotsVerticalIcon from "@mdi/svg/svg/dots-vertical.svg";
import EarthIcon from "@mdi/svg/svg/earth.svg";
import { groupBy, defaults } from "lodash";
import React, { useCallback, useContext, useMemo, useState } from "react";
import styled from "styled-components";

import { TREE_SPACING } from "./TopicTree";
import { ROW_HEIGHT, SLeft, SRightActions, SToggles, STreeNodeRow } from "./TreeNodeRow";
import VisibilityToggle from "./VisibilityToggle";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Icon from "webviz-core/src/components/Icon";
import Menu, { Item } from "webviz-core/src/components/Menu";
import Modal from "webviz-core/src/components/Modal";
import { RenderToBodyPortal } from "webviz-core/src/components/renderToBody";
import Tooltip from "webviz-core/src/components/Tooltip";
import filterMap from "webviz-core/src/filterMap";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import { getDefaultColorOverrideBySourceIdx } from "webviz-core/src/panels/ThreeDimensionalViz/GlobalVariableStyles";
import type { LinkedGlobalVariable } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import { ThreeDimensionalVizContext } from "webviz-core/src/panels/ThreeDimensionalViz/ThreeDimensionalVizContext";
import {
  ColorPickerSettingsPanel,
  PICKER_SIZE,
  getHexFromColorSettingWithDefault,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/ColorPickerForTopicSettings";
import {
  type TreeUINode,
  TooltipRow,
  TooltipTable,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/renderTreeNodes";
import type { Color } from "webviz-core/src/types/Messages";
import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import { joinTopics } from "webviz-core/src/util/topicUtils";

// TODO: Dedupe from renderNamespaceNodes
const OUTER_LEFT_MARGIN = 12;

export const SDisplayName = styled.div`
  font-size: 13px;
  line-height: 1.4;
  margin: 0 4px;
  word-break: break-word;
  /* disallow selection to prevent shift + click from accidentally select */
  user-select: none;
  width: 100%;
`;

export function renderStyleExpressionNodes({
  width,
  isXSWidth,
  topicName,
  hasFeatureColumn,
  linkedGlobalVariablesByTopic,
  visible,
}: {
  hasFeatureColumn: boolean,
  isXSWidth: boolean,
  linkedGlobalVariablesByTopic: { [string]: LinkedGlobalVariable[] },
  topicName: string,
  width: number,
  visible: boolean,
}): TreeUINode[] {
  const rowWidth = width - (isXSWidth ? 0 : TREE_SPACING * 2) - OUTER_LEFT_MARGIN;
  const linkedGlobalVariablesByVariableName = groupBy(
    linkedGlobalVariablesByTopic[topicName] || [],
    ({ name }) => name
  );
  return Object.keys(linkedGlobalVariablesByVariableName).map((variableName, rowIndex) => {
    const title = (
      <StyleExpressionNode
        linkedGlobalVariables={linkedGlobalVariablesByVariableName[variableName]}
        topic={topicName}
        hasFeatureColumn={hasFeatureColumn}
        rowWidth={rowWidth}
        rowIndex={rowIndex}
        variableName={variableName}
        visible={visible}
      />
    );
    return { key: `${topicName}~${variableName}`, title };
  });
}

const SItemContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
const SColorPickerWrapper = styled.span`
  display: inline-flex;
  align-items: center;
`;

const SColorTrigger = styled.span`
  display: inline-block;
  cursor: pointer;
  background: ${({ hexColor }) => hexColor};
  width: ${PICKER_SIZE.SMALL.size}px;
  height: ${PICKER_SIZE.SMALL.size}px;
  border-radius: ${PICKER_SIZE.SMALL.size / 2}px;
`;

function StyleExpressionNode(props) {
  const { topic, rowWidth, rowIndex, hasFeatureColumn, linkedGlobalVariables, visible } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [editingColorForSourceIdx, setEditingColorForSourceIdx] = useState(false);

  const {
    colorOverrideBySourceIdxByVariable,
    setColorOverrideBySourceIdxByVariable,
    setHoveredMarkerMatchers,
  } = useContext(ThreeDimensionalVizContext);

  const { globalVariables } = useGlobalVariables();
  const { markerKeyPath, name } = linkedGlobalVariables[0];

  const value = globalVariables[name];
  const colorOverridesByColumnIdx = defaults(
    [],
    colorOverrideBySourceIdxByVariable[name],
    getDefaultColorOverrideBySourceIdx(rowIndex)
  );
  const activeRowActive = colorOverridesByColumnIdx.some((colorOverride) => colorOverride?.active);

  // Callbacks
  const onToggleMenu = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const updateSettingsForGlobalVariable = useCallback((
    globalVariableName,
    settings: { active: boolean, color: Color },
    sourceIdx = 0
  ) => {
    const updatedSettings = new Array(2)
      .fill()
      .map((_, i) => colorOverrideBySourceIdxByVariable[globalVariableName]?.[i]);
    updatedSettings[sourceIdx] = settings;
    setColorOverrideBySourceIdxByVariable({
      ...colorOverrideBySourceIdxByVariable,
      [globalVariableName]: updatedSettings,
    });
  }, [colorOverrideBySourceIdxByVariable, setColorOverrideBySourceIdxByVariable]);

  // Mouse-hover handlers
  const onMouseLeave = useCallback(() => setHoveredMarkerMatchers([]), [setHoveredMarkerMatchers]);
  const mouseEventHandlersByColumnIdx = useMemo(() => {
    const topicNameByColumnIdx = [topic, joinTopics($WEBVIZ_SOURCE_2, topic)];
    return topicNameByColumnIdx.map((_topic) => ({
      onMouseEnter: () => setHoveredMarkerMatchers([{ topic: _topic, checks: [{ markerKeyPath, value }] }]),
      onMouseLeave,
    }));
  }, [markerKeyPath, onMouseLeave, setHoveredMarkerMatchers, topic, value]);

  const tooltipContent = (
    <TooltipRow>
      <TooltipTable>
        <tbody>
          <tr>
            <th>Topic:</th>
            <td>
              <tt>{topic}</tt>
            </td>
          </tr>
          <tr>
            <th>Expression:</th>
            <td>
              <tt>
                .{markerKeyPath.join(".")} == {value}
              </tt>
            </td>
          </tr>
        </tbody>
      </TooltipTable>
    </TooltipRow>
  );

  return (
    <STreeNodeRow
      visibleInScene={activeRowActive && visible}
      style={{
        width: rowWidth,
        marginLeft: `-${OUTER_LEFT_MARGIN}px`,
      }}>
      <SLeft data-test={`ns~${name}`}>
        <Icon style={{ color: "rgba(255,255,255, 0.3)" }}>
          <EarthIcon style={{ width: 16, height: 16 }} />
        </Icon>
        <Tooltip contents={tooltipContent} placement="top">
          <SDisplayName>
            .{markerKeyPath.join(".")} == ${name}
          </SDisplayName>
        </Tooltip>
      </SLeft>
      <SRightActions>
        {colorOverridesByColumnIdx && (
          <SToggles>
            {filterMap(colorOverridesByColumnIdx, (override, sourceIdx) => {
              if (!hasFeatureColumn && sourceIdx === 1) {
                return null;
              }
              const { active, color } = override || { active: false, color: null };
              return (
                <VisibilityToggle
                  available={true}
                  checked={active}
                  dataTest={`visibility-toggle T:${topic} ${name} ${sourceIdx}`}
                  key={sourceIdx}
                  onAltToggle={() => updateSettingsForGlobalVariable(name, { active: !active, color }, sourceIdx)}
                  onToggle={() => updateSettingsForGlobalVariable(name, { active: !active, color }, sourceIdx)}
                  overrideColor={color}
                  size="SMALL"
                  unavailableTooltip={""}
                  visibleInScene={visible && active}
                  diffModeEnabled={false}
                  columnIndex={sourceIdx}
                  {...mouseEventHandlersByColumnIdx[sourceIdx]}
                />
              );
            })}
          </SToggles>
        )}
        <ChildToggle position="below" isOpen={isOpen} onToggle={onToggleMenu} dataTest={`topic-row-menu-${topic}`}>
          <Icon
            small
            fade
            onClick={onToggleMenu}
            style={{
              padding: "4px 0px",
              height: ROW_HEIGHT,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <DotsVerticalIcon />
          </Icon>
          <Menu>
            <Item onClick={() => setEditingColorForSourceIdx(0)} style={{ padding: "0 12px", height: 28 }}>
              <SItemContent>
                <span style={{ paddingRight: 8 }}>Marker color</span>
                <SColorPickerWrapper>
                  <SColorTrigger hexColor={getHexFromColorSettingWithDefault(colorOverridesByColumnIdx[0]?.color)} />
                </SColorPickerWrapper>
                {editingColorForSourceIdx === 0 && (
                  <ColorPickerOverlay
                    color={colorOverridesByColumnIdx[0]?.color}
                    onChangeColor={(color) => {
                      updateSettingsForGlobalVariable(name, { color, active: colorOverridesByColumnIdx[0].active }, 0);
                    }}
                    onRequestClose={() => setEditingColorForSourceIdx(-1)}
                  />
                )}
              </SItemContent>
            </Item>
            {hasFeatureColumn && (
              <Item onClick={() => setEditingColorForSourceIdx(1)} style={{ padding: "0 12px", height: 28 }}>
                <SItemContent>
                  <span style={{ paddingRight: 8 }}>Feature marker color</span>
                  <SColorPickerWrapper>
                    <SColorTrigger hexColor={getHexFromColorSettingWithDefault(colorOverridesByColumnIdx[1]?.color)} />
                  </SColorPickerWrapper>
                  {editingColorForSourceIdx === 1 && (
                    <ColorPickerOverlay
                      color={colorOverridesByColumnIdx[1]?.color}
                      onChangeColor={(color) => {
                        const active = colorOverridesByColumnIdx[1].active;
                        updateSettingsForGlobalVariable(name, { color, active }, 1);
                      }}
                      onRequestClose={() => setEditingColorForSourceIdx(-1)}
                    />
                  )}
                </SItemContent>
              </Item>
            )}
          </Menu>
        </ChildToggle>
      </SRightActions>
    </STreeNodeRow>
  );
}

function ColorPickerOverlay({
  onChangeColor,
  onRequestClose,
  color,
}: {
  color: Color,
  onChangeColor: (color: Color) => void,
  onRequestClose: () => void,
}) {
  return (
    <RenderToBodyPortal>
      <Modal
        onRequestClose={onRequestClose}
        contentStyle={{
          maxHeight: "calc(100vh - 200px)",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
        }}>
        <ColorPickerSettingsPanel color={color} onChange={onChangeColor} />
      </Modal>
    </RenderToBodyPortal>
  );
}
