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
import TimeBasedChart from "webviz-core/src/components/TimeBasedChart";
import type { TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart";
import derivative from "webviz-core/src/panels/Plot/derivative";
import type { PlotPath } from "webviz-core/src/panels/Plot/internalTypes";
import { lightColor, lineColors } from "webviz-core/src/util/plotColors";
import { subtractTimes, toSec } from "webviz-core/src/util/time";

export type PlotChartPoint = {|
  x: number,
  y: number,
  tooltip: TimeBasedChartTooltipData,
|};

const getDatasets = (paths: PlotPath[], itemsByPath: MessageHistoryItemsByPath, startTime: Time) => {
  return paths
    .map((path: PlotPath, index: number) => {
      if (!path.enabled) {
        return null;
      }

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
    })
    .filter(Boolean);
};

// min/maxYValue is NaN when it's unset, and an actual number otherwise.
const yAxes = createSelector(
  (minMax): { minYValue: number, maxYValue: number } => minMax,
  ({ minYValue, maxYValue }: { minYValue: number, maxYValue: number }) => [
    {
      ticks: {
        suggestedMin: isNaN(minYValue) ? undefined : minYValue,
        suggestedMax: isNaN(maxYValue) ? undefined : maxYValue,
        precision: 3,
        callback: (val, idx, vals) => (idx === 0 || idx === vals.length - 1 ? "" : `${Math.round(val * 1000) / 1000}`),
      },
      gridLines: {
        color: "rgba(255, 255, 255, 0.2)",
        zeroLineColor: "rgba(255, 255, 255, 0.2)",
      },
    },
  ]
);

type PlotChartProps = {| paths: PlotPath[], minYValue: number, maxYValue: number |};
export default class PlotChart extends PureComponent<PlotChartProps> {
  render() {
    const { paths, minYValue, maxYValue } = this.props;
    return (
      // Don't filter out disabled paths when passing into <MessageHistory>, because we still want
      // easy access to the history when turning the disabled paths back on.
      <MessageHistory ignoreMissing paths={paths.map((path) => path.value)}>
        {({ itemsByPath, startTime }: MessageHistoryData) => {
          const datasets = getDatasets(paths, itemsByPath, startTime);

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
                    type="scatter"
                    yAxes={yAxes({ minYValue, maxYValue })}
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
