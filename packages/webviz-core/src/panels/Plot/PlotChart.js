// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import flatten from "lodash/flatten";
import React, { memo } from "react";
import Dimensions from "react-container-dimensions";
import { createSelector } from "reselect";
import { Time } from "rosbag";
import uuid from "uuid";

import styles from "./PlotChart.module.scss";
import { type MessageHistoryItemsByPath } from "webviz-core/src/components/MessageHistoryDEPRECATED";
import TimeBasedChart, { type TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart";
import filterMap from "webviz-core/src/filterMap";
import derivative from "webviz-core/src/panels/Plot/derivative";
import {
  type PlotPath,
  type BasePlotPath,
  isReferenceLinePlotPathType,
} from "webviz-core/src/panels/Plot/internalTypes";
import { lightColor, lineColors } from "webviz-core/src/util/plotColors";
import { format, formatTimeRaw, getTimestampForMessage, isTime, subtractTimes, toSec } from "webviz-core/src/util/time";

export type PlotChartPoint = {|
  x: number,
  y: number,
  tooltip?: TimeBasedChartTooltipData,
|};

export type DataSet = {|
  borderColor: string,
  borderWidth: number,
  data: Array<PlotChartPoint>,
  fill: boolean,
  key: string,
  label: string,
  pointBackgroundColor: string,
  pointBorderColor: string,
  pointHoverRadius: number,
  pointRadius: number,
  showLine: boolean,
|};

const Y_AXIS_ID = "Y_AXIS_ID";

function getXForPoint(xAxisVal, timestamp, innerIdx, itemsByPath, xAxisPath, outerIdx): number {
  if (xAxisVal === "custom" && xAxisPath) {
    if (isReferenceLinePlotPathType(xAxisPath)) {
      return Number.parseFloat(xAxisPath.value);
    }
    if (itemsByPath[xAxisPath.value]) {
      const item = itemsByPath[xAxisPath.value][outerIdx];
      return item ? Number(item.queriedData[innerIdx]?.value) : NaN;
    }
  }
  return xAxisVal === "timestamp" ? timestamp : innerIdx;
}

const scaleOptions = {
  fixedYAxisWidth: 48,
  yAxisTicks: "hideFirstAndLast",
};

function getDatasetAndTooltipsFromMessagePlotPath(
  path: PlotPath,
  itemsByPath: MessageHistoryItemsByPath,
  index: number,
  startTime: Time,
  xAxisVal: "timestamp" | "index" | "custom",
  includeTooltipInData: boolean,
  xAxisPath?: BasePlotPath
): { dataset: DataSet, tooltips: TimeBasedChartTooltipData[] } {
  let tooltips: TimeBasedChartTooltipData[] = [];
  let points: PlotChartPoint[] = [];
  let showLine = true;
  const datasetKey = index.toString();

  for (const [outerIdx, item] of itemsByPath[path.value].entries()) {
    const timestamp = getTimestampForMessage(item.message, path.timestampMethod);
    if (!timestamp) {
      continue;
    }
    const elapsedTime = toSec(subtractTimes(timestamp, startTime));
    for (const [innerIdx, { value, path: queriedPath, constantName }] of item.queriedData.entries()) {
      if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
        const valueNum = Number(value);
        if (!isNaN(valueNum)) {
          const x = getXForPoint(xAxisVal, elapsedTime, innerIdx, itemsByPath, xAxisPath, outerIdx);
          const y = valueNum;
          const tooltip = { x, y, datasetKey, item, path: queriedPath, value, constantName, startTime };
          if (includeTooltipInData) {
            points.push({ x, y, tooltip });
          } else {
            points.push({ x, y });
          }
          tooltips.push(tooltip);
        }
      } else if (isTime(value)) {
        // $FlowFixMe - %checks on isTime can't convince Flow that the object is actually a Time. Related: https://github.com/facebook/flow/issues/3614
        const timeValue = (value: Time);
        const x = getXForPoint(xAxisVal, elapsedTime, innerIdx, itemsByPath, xAxisPath, outerIdx);
        const y = toSec(timeValue);
        const tooltip = {
          x,
          y,
          datasetKey,
          datasetIndex: innerIdx,
          item,
          path: queriedPath,
          value: `${format(timeValue)} (${formatTimeRaw(timeValue)})`,
          constantName,
          startTime,
        };
        if (includeTooltipInData) {
          points.push({ x, y, tooltip });
        } else {
          points.push({ x, y });
        }
        tooltips.push(tooltip);
      }
    }
    // If we have added more than one point for this message, make it a scatter plot.
    if (item.queriedData.length > 1 && xAxisVal !== "index") {
      showLine = false;
    }
  }

  if (path.value.includes(".@derivative")) {
    if (showLine) {
      const { points: derivativePoints, tooltips: derivativeTooltips } = derivative(
        points,
        tooltips,
        includeTooltipInData
      );
      points = derivativePoints;
      tooltips = derivativeTooltips;
    } else {
      // If we have a scatter plot, we can't take the derivative, so instead show nothing
      // (nothing is better than incorrect data).
      points = [];
    }
  }

  const dataset = {
    borderColor: lineColors[index % lineColors.length],
    label: path.value || uuid.v4(),
    key: datasetKey,
    showLine,
    fill: false,
    borderWidth: 1,
    pointRadius: 1.5,
    pointHoverRadius: 3,
    pointBackgroundColor: lightColor(lineColors[index % lineColors.length]),
    pointBorderColor: "transparent",
    data: points,
  };
  return { dataset, tooltips };
}

// A "reference line" plot path is a numeric value. It creates a horizontal line on the plot at the specified value.
function getAnnotationFromReferenceLine(path: PlotPath, index: number) {
  return {
    type: "line",
    drawTime: "beforeDatasetsDraw",
    scaleID: Y_AXIS_ID,
    label: path.value,
    borderColor: lineColors[index % lineColors.length],
    borderDash: [5, 5],
    borderWidth: 1,
    mode: "horizontal",
    value: Number.parseFloat(path.value),
  };
}

export function getDatasetsAndTooltips(
  paths: PlotPath[],
  itemsByPath: MessageHistoryItemsByPath,
  startTime: Time,
  xAxisVal: "timestamp" | "index" | "custom",
  includeTooltipInData: boolean,
  xAxisPath?: BasePlotPath
): { datasets: DataSet[], tooltips: TimeBasedChartTooltipData[] } {
  const datasetsAndTooltips = filterMap(paths, (path: PlotPath, index: number) => {
    if (!path.enabled) {
      return null;
    } else if (!isReferenceLinePlotPathType(path)) {
      return getDatasetAndTooltipsFromMessagePlotPath(
        path,
        itemsByPath,
        index,
        startTime,
        xAxisVal,
        includeTooltipInData,
        xAxisPath
      );
    }
    return null;
  });

  return {
    datasets: datasetsAndTooltips.map(({ dataset }) => dataset),
    tooltips: flatten(datasetsAndTooltips.map(({ tooltips }) => tooltips)),
  };
}

function getAnnotations(paths: PlotPath[]) {
  return filterMap(paths, (path: PlotPath, index: number) => {
    if (!path.enabled) {
      return null;
    } else if (isReferenceLinePlotPathType(path)) {
      return getAnnotationFromReferenceLine(path, index);
    }
    return null;
  });
}

type YAxesInterface = {| minY: number, maxY: number, scaleId: string |};
// min/maxYValue is NaN when it's unset, and an actual number otherwise.
const yAxes = createSelector<YAxesInterface, _, _, _>(
  (params) => params,
  ({ minY, maxY, scaleId }: YAxesInterface) => {
    const min = isNaN(minY) ? undefined : minY;
    const max = isNaN(maxY) ? undefined : maxY;
    return [
      {
        id: scaleId,
        ticks: {
          min,
          max,
          precision: 3,
          callback: (val, idx, vals) =>
            idx === 0 || idx === vals.length - 1 ? "" : `${Math.round(val * 1000) / 1000}`,
        },
        gridLines: {
          color: "rgba(255, 255, 255, 0.2)",
          zeroLineColor: "rgba(255, 255, 255, 0.2)",
        },
      },
    ];
  }
);

type PlotChartProps = {|
  paths: PlotPath[],
  minYValue: number,
  maxYValue: number,
  saveCurrentYs: (minY: number, maxY: number) => void,
  datasets: DataSet[],
  tooltips: TimeBasedChartTooltipData[],
  xAxisVal: "timestamp" | "index" | "custom",
|};
export default memo<PlotChartProps>(function PlotChart(props: PlotChartProps) {
  const { paths, minYValue, maxYValue, saveCurrentYs, datasets, tooltips, xAxisVal } = props;
  const annotations = getAnnotations(paths);

  return (
    <div className={styles.root}>
      <Dimensions>
        {({ width, height }) => (
          <TimeBasedChart
            // Force a redraw every time the x-axis value changes.
            key={xAxisVal}
            isSynced
            zoom
            width={width}
            height={height}
            data={{ datasets }}
            tooltips={tooltips}
            annotations={annotations}
            type="scatter"
            yAxes={yAxes({ minY: minYValue, maxY: maxYValue, scaleId: Y_AXIS_ID })}
            saveCurrentYs={saveCurrentYs}
            xAxisVal={xAxisVal}
            scaleOptions={scaleOptions}
            useFixedYAxisWidth
          />
        )}
      </Dimensions>
    </div>
  );
});
