// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { PureComponent } from "react";
import Dimensions from "react-container-dimensions";
import { createSelector } from "reselect";
import { Time } from "rosbag";

import styles from "./PlotChart.module.scss";
import MessageHistory, {
  getTimestampForMessage,
  type MessageHistoryData,
  type MessageHistoryItemsByPath,
} from "webviz-core/src/components/MessageHistory";
import TimeBasedChart, { type TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart";
import derivative from "webviz-core/src/panels/Plot/derivative";
import { type PlotPath, isReferenceLinePlotPathType } from "webviz-core/src/panels/Plot/internalTypes";
import { lightColor, lineColors } from "webviz-core/src/util/plotColors";
import { subtractTimes, toSec } from "webviz-core/src/util/time";

export type PlotChartPoint = {|
  x: number,
  y: number,
  tooltip: TimeBasedChartTooltipData,
|};

const Y_AXIS_ID = "Y_AXIS_ID";

function getDatasetFromMessagePlotPath(
  path: PlotPath,
  itemsByPath: MessageHistoryItemsByPath,
  index: number,
  startTime: Time
) {
  let points: PlotChartPoint[] = [];
  let showLine = true;

  for (const item of itemsByPath[path.value]) {
    const timestamp = getTimestampForMessage(item.message, path.timestampMethod);
    if (timestamp === null) {
      continue;
    }

    for (const { value, path, constantName } of item.queriedData) {
      if (typeof value === "number" || typeof value === "boolean") {
        points.push({
          x: toSec(subtractTimes(timestamp, startTime)),
          y: Number(value),
          tooltip: { item, path, value, constantName, startTime },
        });
      }
    }
    // If we have added more than one point for this message, make it a scatter plot.
    if (item.queriedData.length > 1) {
      showLine = false;
    }
  }

  if (path.value.includes(".@derivative")) {
    if (showLine) {
      points = derivative(points);
    } else {
      // If we have a scatter plot, we can't take the derivative, so instead show nothing
      // (nothing is better than incorrect data).
      points = [];
    }
  }

  return {
    borderColor: lineColors[index % lineColors.length],
    label: path.value,
    key: index.toString(),
    showLine,
    fill: false,
    borderWidth: 1,
    pointRadius: 1.5,
    pointHoverRadius: 3,
    pointBackgroundColor: lightColor(lineColors[index % lineColors.length]),
    pointBorderColor: "transparent",
    data: points,
  };
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

function getDatasets(paths: PlotPath[], itemsByPath: MessageHistoryItemsByPath, startTime: Time) {
  return paths
    .map((path: PlotPath, index: number) => {
      if (!path.enabled) {
        return null;
      } else if (!isReferenceLinePlotPathType(path)) {
        return getDatasetFromMessagePlotPath(path, itemsByPath, index, startTime);
      }
      return null;
    })
    .filter(Boolean);
}

function getAnnotations(paths: PlotPath[]) {
  return paths
    .map((path: PlotPath, index: number) => {
      if (!path.enabled) {
        return null;
      } else if (isReferenceLinePlotPathType(path)) {
        return getAnnotationFromReferenceLine(path, index);
      }
      return null;
    })
    .filter(Boolean);
}

// min/maxYValue is NaN when it's unset, and an actual number otherwise.
const yAxes = createSelector(
  (params): { minYValue: number, maxYValue: number, isYAxisLocked: boolean, scaleId: string } => params,
  ({
    minYValue,
    maxYValue,
    isYAxisLocked,
    scaleId,
  }: {
    minYValue: number,
    maxYValue: number,
    isYAxisLocked: boolean,
    scaleId: string,
  }) => {
    const min = isNaN(minYValue) ? undefined : minYValue;
    const max = isNaN(maxYValue) ? undefined : maxYValue;
    return [
      {
        id: scaleId,
        ticks: {
          min: isYAxisLocked ? min : undefined,
          max: isYAxisLocked ? max : undefined,
          suggestedMin: isYAxisLocked ? undefined : min,
          suggestedMax: isYAxisLocked ? undefined : max,
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

type PlotChartProps = {| paths: PlotPath[], minYValue: number, maxYValue: number, isYAxisLocked: boolean |};
export default class PlotChart extends PureComponent<PlotChartProps> {
  render() {
    const { paths, minYValue, maxYValue, isYAxisLocked } = this.props;
    return (
      // Don't filter out disabled paths when passing into <MessageHistory>, because we still want
      // easy access to the history when turning the disabled paths back on.
      <MessageHistory ignoreMissing paths={paths.map((path) => path.value)}>
        {({ itemsByPath, startTime }: MessageHistoryData) => {
          const datasets = getDatasets(paths, itemsByPath, startTime);
          const annotations = getAnnotations(paths);

          return (
            <div className={styles.root}>
              <Dimensions>
                {({ width, height }) => (
                  <TimeBasedChart
                    isSynced
                    zoom
                    width={width}
                    height={height}
                    data={{ datasets }}
                    annotations={annotations}
                    type="scatter"
                    yAxes={yAxes({ minYValue, maxYValue, isYAxisLocked, scaleId: Y_AXIS_ID })}
                  />
                )}
              </Dimensions>
            </div>
          );
        }}
      </MessageHistory>
    );
  }
}
