// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import AlertCircleIcon from "@mdi/svg/svg/alert-circle.svg";
import CheckboxCircleOutlineIcon from "@mdi/svg/svg/checkbox-blank-circle-outline.svg";
import FormatLineStyleIcon from "@mdi/svg/svg/format-line-style.svg";
import PencilIcon from "@mdi/svg/svg/pencil.svg";
import RecordCircleOutlineIcon from "@mdi/svg/svg/record-circle-outline.svg";
import cx from "classnames";
import ColorPicker from "rc-color-picker";
import React, { useMemo } from "react";
import styled from "styled-components";

import { plotableRosTypes } from "./index";
import styles from "./PlotLegend.module.scss";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import DashArrayLine from "webviz-core/src/components/DashArrayLine";
import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import MessagePathInput from "webviz-core/src/components/MessagePathSyntax/MessagePathInput";
import Tooltip from "webviz-core/src/components/Tooltip";
import type { LineStyle } from "webviz-core/src/panels/Plot";
import { type PlotPath, isReferenceLinePlotPathType } from "webviz-core/src/panels/Plot/internalTypes";
import { DEFAULT_PLOT_LINE_STYLE } from "webviz-core/src/util/plotColors";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import type { TimestampMethod } from "webviz-core/src/util/time";

const SStyleMenuItem = styled.div`
  & + & {
    margin-left: 4px;
  }
`;

const SLineColor = styled.div`
  position: relative;
  padding: 4px;
  text-align: center;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .rc-color-picker-trigger {
    opacity: 0;
  }
`;

const SLineStyle = styled.div`
  padding: 4px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const SLineColorStrip = styled.div(
  ({ color }) => `
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  width: 100%;
  height: 100%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  position: absolute;
  border-bottom: 3px solid ${color};
  box-sizing: content-box;
`
);

type PlotLegendItemProps = {|
  path: PlotPath,
  index: number,
  lineStyle: LineStyle,
  xAxisVal: string,
  onChangeLineStyle: ($Shape<LineStyle>) => void,
  onPathInputChange: (value: string, index: ?number) => void,
  onInputTimestampMethodChange: (TimestampMethod, index: ?number) => void,
  onRemove: () => void,
  onToggleEnabled: () => void,
  pathsWithMismatchedDataLengths: string[],
|};

const PlotLegendItem = ({
  path,
  index,
  onPathInputChange,
  onChangeLineStyle,
  onInputTimestampMethodChange,
  pathsWithMismatchedDataLengths,
  onRemove,
  onToggleEnabled,
  lineStyle,
  xAxisVal,
}: PlotLegendItemProps) => {
  const isReferenceLinePlotPath = isReferenceLinePlotPathType(path);
  let timestampMethod;
  // Only allow chosing the timestamp method if it is applicable (not a reference line) and there is at least
  // one character typed.
  if (!isReferenceLinePlotPath && path.value.length > 0) {
    timestampMethod = path.timestampMethod;
  }
  const hasMismatchedDataLength = pathsWithMismatchedDataLengths.includes(path.value);
  const color = (path.enabled && lineStyle?.color) || "#777";
  const borderWidth = lineStyle?.borderWidth ?? 1;
  const borderDash = lineStyle?.borderDash;
  const showPoints = lineStyle?.pointRadius !== 0;

  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [colorPickerOpen, setColorPickerOpen] = React.useState<boolean>(false);

  const lineStylePresets: $Shape<LineStyle>[] = React.useMemo(() => {
    return [
      { borderWidth: 1 },
      { borderWidth: 2 },
      { borderWidth: 4 },
      { borderDash: [7, 7] },
      { borderDash: [2, 2] },
    ].map((partial) => ({ borderWidth: 1, borderDash: undefined, ...partial }));
  }, []);

  const onChangeColor = React.useCallback((newColor: { color: string, alpha: number }) => {
    onChangeLineStyle({ ...lineStyle, color: newColor.color });
  }, [lineStyle, onChangeLineStyle]);

  const onChangeBorderStyle = React.useCallback((lineStyleConfigIndex) => {
    onChangeLineStyle({ ...lineStyle, ...lineStylePresets[lineStyleConfigIndex] });
  }, [lineStyle, lineStylePresets, onChangeLineStyle]);

  const togglePointVisible = React.useCallback(() => {
    onChangeLineStyle({ ...lineStyle, pointRadius: showPoints ? 0 : DEFAULT_PLOT_LINE_STYLE.pointRadius });
  }, [lineStyle, onChangeLineStyle, showPoints]);

  const lineStyleIndex = useMemo(() => {
    return lineStylePresets.findIndex(
      (config) => config.borderWidth === lineStyle.borderWidth && config.borderDash === lineStyle.borderDash
    );
  }, [lineStyle.borderDash, lineStyle.borderWidth, lineStylePresets]);

  return (
    <div className={styles.item}>
      <div
        className={cx({
          [styles.itemAxisLabel]: true,
          [styles.clickable]: true,
        })}
        style={{ opacity: path.enabled ? 1 : 0.7 }}
        onClick={onToggleEnabled}>
        y:
      </div>
      <ChildToggle
        position="below"
        onToggle={React.useCallback(() => setIsOpen((open) => !open || colorPickerOpen), [colorPickerOpen])}
        isOpen={isOpen}>
        <div className={styles.itemIconContainer}>
          <DashArrayLine
            className={styles.itemLineStyle}
            borderDash={borderDash}
            borderWidth={borderWidth}
            stroke={color}
          />
        </div>
        <div className={styles.styleMenu}>
          <SStyleMenuItem>
            <Tooltip contents="Change line color">
              <SLineColor>
                <ColorPicker
                  animation="slide-up"
                  color={color}
                  onChange={onChangeColor}
                  onOpen={() => setColorPickerOpen(true)}
                  onClose={React.useCallback(() => {
                    setColorPickerOpen(false);
                    setIsOpen(false);
                  }, [])}
                />
                <SLineColorStrip color={color}>
                  <Icon medium>
                    <PencilIcon />
                  </Icon>
                </SLineColorStrip>
              </SLineColor>
            </Tooltip>
          </SStyleMenuItem>
          <SStyleMenuItem>
            <Dropdown
              noPortal
              onChange={onChangeBorderStyle}
              value={lineStyleIndex}
              toggleComponent={
                <Tooltip contents="Change line style">
                  <SLineStyle>
                    <Icon medium>
                      <FormatLineStyleIcon />
                    </Icon>
                  </SLineStyle>
                </Tooltip>
              }>
              {lineStylePresets.map((lineStyleConfig, i) => (
                <div key={i} value={i} style={{ position: "relative", width: 50, height: 10, marginRight: 8 }}>
                  <DashArrayLine
                    className={styles.itemLineStyle}
                    borderDash={lineStyleConfig.borderDash}
                    borderWidth={lineStyleConfig.borderWidth ?? 1}
                    stroke={color}
                  />
                </div>
              ))}
            </Dropdown>
          </SStyleMenuItem>
          <SStyleMenuItem>
            <Tooltip contents="Toggle points">
              <SLineStyle onClick={togglePointVisible}>
                <Icon medium>{showPoints ? <RecordCircleOutlineIcon /> : <CheckboxCircleOutlineIcon />}</Icon>
              </SLineStyle>
            </Tooltip>
          </SStyleMenuItem>
        </div>
      </ChildToggle>
      <div
        className={cx({
          [styles.itemInput]: true,
          [styles.itemInputDisabled]: !path.enabled,
        })}>
        <MessagePathInput
          path={path.value}
          onChange={onPathInputChange}
          onTimestampMethodChange={onInputTimestampMethodChange}
          validTypes={plotableRosTypes}
          placeholder="Enter a topic name or a number"
          index={index}
          autoSize
          disableAutocomplete={isReferenceLinePlotPath}
          {...(xAxisVal === "timestamp" ? { timestampMethod } : null)}
        />
        {hasMismatchedDataLength && (
          <Icon
            style={{ color: colors.RED }}
            clickable={false}
            small
            tooltipProps={{ placement: "top" }}
            tooltip="Mismatch in the number of elements in x-axis and y-axis messages">
            <AlertCircleIcon />
          </Icon>
        )}
      </div>
      <div className={styles.itemRemove} onClick={onRemove}>
        ✕
      </div>
    </div>
  );
};

export default PlotLegendItem;
