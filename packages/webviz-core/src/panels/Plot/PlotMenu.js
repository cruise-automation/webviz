// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import React from "react";

import styles from "./PlotMenu.module.scss";
import { PanelToolbarInput } from "webviz-core/shared/panelToolbarStyles";
import Item from "webviz-core/src/components/Menu/Item";
import { type TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart";
import type { PlotConfig } from "webviz-core/src/panels/Plot";
import { type DataSet, type PlotChartPoint } from "webviz-core/src/panels/Plot/PlotChart";
import { downloadFiles } from "webviz-core/src/util";
import { formatTimeRaw } from "webviz-core/src/util/time";

function isValidInput(value: string) {
  return value === "" || !isNaN(parseFloat(value));
}

export function getHeader(message: any) {
  let header = null;
  for (const key in message) {
    if (key.includes("header")) {
      header = message[key];
    }
  }
  return header;
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
  const { receiveTime, message } = tooltip.item.message;
  const receiveTimeFloat = formatTimeRaw(receiveTime);
  const header = getHeader(message);
  const stampTime = header ? formatTimeRaw(header.stamp) : "";
  return [x, receiveTimeFloat, stampTime, label, y];
}

export function getCSVData(datasets: DataSet[], tooltips: TimeBasedChartTooltipData[]): string {
  const headLine = ["elapsed time", "receive time", "header.stamp", "topic", "value"];
  const combinedLines = [];
  combinedLines.push(headLine);
  datasets.forEach((dataset, idx) => {
    dataset.data.forEach((data, dataIndex) => {
      combinedLines.push(formatData(data, dataIndex, dataset.label, dataset.key, tooltips));
    });
  });
  return combinedLines.join("\n");
}

function downloadCsvFile(datasets: DataSet[], tooltips: TimeBasedChartTooltipData[]) {
  const csv = getCSVData(datasets, tooltips);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadFiles([{ blob, fileName: `plot_data_export.csv` }]);
}

export default function PlotMenu({
  minYValue,
  maxYValue,
  saveConfig,
  setMinMax,
  datasets,
  xAxisVal = "timestamp",
  tooltips,
}: {
  minYValue: string,
  maxYValue: string,
  saveConfig: ($Shape<PlotConfig>) => void,
  setMinMax: ($Shape<PlotConfig>) => void,
  datasets: DataSet[],
  xAxisVal?: "timestamp" | "index" | "custom",
  tooltips: TimeBasedChartTooltipData[],
}) {
  return (
    <>
      <Item onClick={() => saveConfig({ maxYValue: maxYValue === "" ? "10" : "" })} tooltip="Maximum y-axis value">
        <div className={styles.label}>Maximum</div>
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
      </Item>
      <Item onClick={() => saveConfig({ minYValue: minYValue === "" ? "-10" : "" })} tooltip="Maximum y-axis value">
        <div className={styles.label}>Minimum</div>
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
      </Item>
      <Item>
        <button onClick={setMinMax}>Set min/max to current</button>
      </Item>
      <Item>
        <button onClick={() => downloadCsvFile(datasets, tooltips)}>Download plot data (csv)</button>
      </Item>
    </>
  );
}
