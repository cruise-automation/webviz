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
import { PanelToolbarLabel, PanelToolbarInput } from "webviz-core/shared/panelToolbarStyles";
import Dropdown from "webviz-core/src/components/Dropdown";
import Item from "webviz-core/src/components/Menu/Item";
import type { PlotConfig } from "webviz-core/src/panels/Plot";
import { type DataSet } from "webviz-core/src/panels/Plot/PlotChart";
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

function formatData(data: any, label: string) {
  const { x, y } = data;
  const { receiveTime, message } = data.tooltip.item.message;
  const receiveTimeFloat = formatTimeRaw(receiveTime);
  const header = getHeader(message);
  const stampTime = header ? formatTimeRaw(header.stamp) : "";
  return [x, receiveTimeFloat, stampTime, label, y];
}

export function getCSVData(datasets: DataSet[]): string {
  const headLine = ["elapsed time", "receive time", "header.stamp", "topic", "value"];
  const combinedLines = [];
  combinedLines.push(headLine);
  datasets.forEach((dataset, idx) => {
    dataset.data.forEach((data) => {
      combinedLines.push(formatData(data, dataset.label));
    });
  });
  return combinedLines.join("\n");
}

function downloadCsvFile(datasets: DataSet[]) {
  const csv = getCSVData(datasets);
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
}: {
  minYValue: string,
  maxYValue: string,
  saveConfig: ($Shape<PlotConfig>) => void,
  setMinMax: ($Shape<PlotConfig>) => void,
  datasets: DataSet[],
  xAxisVal?: "timestamp" | "index",
}) {
  return (
    <>
      <Item>
        <PanelToolbarLabel>X-axis</PanelToolbarLabel>
        <Dropdown value={xAxisVal} onChange={(newXAxisVal) => saveConfig({ xAxisVal: newXAxisVal })}>
          <span value="timestamp">timestamp</span>
          <span value="index">index</span>
        </Dropdown>
      </Item>
      <Item onClick={() => saveConfig({ maxYValue: maxYValue === "" ? "10" : "" })}>
        <div className={styles.label}>Maximum</div>
        <PanelToolbarInput
          className={cx(styles.input, { [styles.inputError]: !isValidInput(maxYValue) })}
          value={maxYValue}
          onChange={(event) => {
            saveConfig({ maxYValue: event.target.value });
          }}
          onClick={(event) => event.stopPropagation()}
          placeholder="auto"
        />
      </Item>
      <Item onClick={() => saveConfig({ minYValue: minYValue === "" ? "-10" : "" })}>
        <div className={styles.label}>Minimum</div>
        <PanelToolbarInput
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
        <button onClick={setMinMax}>Set min and max</button>
      </Item>
      <Item>
        <button onClick={() => downloadCsvFile(datasets)}>Download plot data (csv)</button>
      </Item>
    </>
  );
}
