// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import React, { memo, useMemo } from "react";
import styled from "styled-components";

import styles from "./PlotMenu.module.scss";
import { PanelToolbarInput } from "webviz-core/shared/panelToolbarStyles";
import Item from "webviz-core/src/components/Menu/Item";
import { type TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart/utils";
import type { PlotConfig, PlotXAxisVal } from "webviz-core/src/panels/Plot";
import { type DataSet, type PlotChartPoint } from "webviz-core/src/panels/Plot/PlotChart";
import { downloadFiles } from "webviz-core/src/util";
import { formatTimeRaw } from "webviz-core/src/util/time";

const SLabel = styled.div`
  flex-grow: 1;
`;

const SFlexRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const SButton = styled.button`
  width: calc(100% - 0.2em);
`;

function isValidInput(value: string) {
  return value === "" || !isNaN(parseFloat(value));
}

function isValidWidth(value: string) {
  return value === "" || parseFloat(value) > 0;
}

function formatData(
  data: PlotChartPoint,
  dataIndex: number,
  label: string,
  datasetKey: string,
  tooltips: TimeBasedChartTooltipData[]
) {
  const { x, y } = data;
  const tooltip = tooltips.find((_tooltip) => _tooltip.datasetKey === datasetKey);
  if (!tooltip) {
    throw new Error("Cannot find tooltip for dataset: this should never happen");
  }
  const { receiveTime, headerStamp } = tooltip.item;
  const receiveTimeFloat = formatTimeRaw(receiveTime);
  const stampTime = headerStamp ? formatTimeRaw(headerStamp) : "";
  return [x, receiveTimeFloat, stampTime, label, y];
}

const xAxisCsvColumnName = (xAxisVal: PlotXAxisVal): string =>
  ({
    timestamp: "elapsed time",
    index: "index",
    custom: "x value",
    currentCustom: "x value",
  }[xAxisVal]);

export function getCSVData(datasets: DataSet[], tooltips: TimeBasedChartTooltipData[], xAxisVal: PlotXAxisVal): string {
  const headLine = [xAxisCsvColumnName(xAxisVal), "receive time", "header.stamp", "topic", "value"];
  const combinedLines = [];
  combinedLines.push(headLine);
  datasets.forEach((dataset) => {
    dataset.data.forEach((data, dataIndex) => {
      combinedLines.push(formatData(data, dataIndex, dataset.label, dataset.key, tooltips));
    });
  });
  return combinedLines.join("\n");
}

function downloadCsvFile(datasets: DataSet[], tooltips: TimeBasedChartTooltipData[], xAxisVal: PlotXAxisVal) {
  const csv = getCSVData(datasets, tooltips, xAxisVal);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadFiles([{ blob, fileName: `plot_data_export.csv` }]);
}

type Props = {|
  displayWidth: string,
  minYValue: string,
  maxYValue: string,
  saveConfig: ($Shape<PlotConfig>) => void,
  setMinMax: ($Shape<PlotConfig>) => void,
  setWidth: ($Shape<PlotConfig>) => void,
  getDatasets: () => DataSet[],
  getTooltips: () => TimeBasedChartTooltipData[],
  xAxisVal: PlotXAxisVal,
|};

export default memo<Props>(function PlotMenu({
  displayWidth,
  minYValue,
  maxYValue,
  saveConfig,
  setMinMax,
  setWidth,
  xAxisVal,
  getDatasets,
  getTooltips,
}: Props) {
  return useMemo(() => {
    const followWidthItem =
      xAxisVal === "timestamp" ? (
        <>
          <Item onClick={() => saveConfig({ followingViewWidth: "" })} tooltip="Plot width in sec">
            <SFlexRow>
              <SLabel>X range</SLabel>
              <PanelToolbarInput
                type="number"
                className={cx(styles.input, { [styles.inputError]: !isValidWidth(displayWidth) })}
                value={displayWidth}
                onChange={({ target: { value } }) => {
                  const isZero = parseFloat(value) === 0;
                  saveConfig({ followingViewWidth: isZero ? "" : value });
                }}
                min="0"
                onClick={(event) => event.stopPropagation()}
                placeholder="auto"
              />
            </SFlexRow>
          </Item>
          <Item>
            <SButton onClick={setWidth}>Set to current view</SButton>
          </Item>
        </>
      ) : null;
    return (
      <>
        <Item
          onClick={() => {
            downloadCsvFile(getDatasets(), getTooltips(), xAxisVal);
          }}>
          Download plot data (csv)
        </Item>
        <hr />
        <Item isHeader>Zoom extents</Item>
        <Item onClick={() => saveConfig({ maxYValue: maxYValue === "" ? "10" : "" })} tooltip="Maximum y-axis value">
          <SFlexRow>
            <SLabel>Y max</SLabel>
            <PanelToolbarInput
              type="number"
              className={cx(styles.input, { [styles.inputError]: !isValidInput(maxYValue) })}
              value={maxYValue}
              onChange={(event) => {
                saveConfig({ maxYValue: event.target.value });
              }}
              onClick={(event) => event.stopPropagation()}
              placeholder="auto"
            />
          </SFlexRow>
        </Item>
        <Item onClick={() => saveConfig({ minYValue: minYValue === "" ? "-10" : "" })} tooltip="Minimum y-axis value">
          <SFlexRow>
            <SLabel>Y min</SLabel>
            <PanelToolbarInput
              type="number"
              className={cx(styles.input, { [styles.inputError]: !isValidInput(minYValue) })}
              value={minYValue}
              onChange={(event) => {
                saveConfig({ minYValue: event.target.value });
              }}
              onClick={(event) => event.stopPropagation()}
              placeholder="auto"
            />
          </SFlexRow>
        </Item>
        <Item>
          <SButton onClick={setMinMax}>Set to current view</SButton>
        </Item>
        {followWidthItem}
      </>
    );
  }, [xAxisVal, displayWidth, setWidth, maxYValue, minYValue, setMinMax, saveConfig, getDatasets, getTooltips]);
});
