// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import flatten from "lodash/flatten";
import React, { memo, useMemo } from "react";
import { Time } from "rosbag";
import uuid from "uuid";

import type { PlotXAxisVal } from "./index";
import styles from "./PlotChart.module.scss";
import Dimensions from "webviz-core/src/components/Dimensions";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import TimeBasedChart, { type ChartDefaultView } from "webviz-core/src/components/TimeBasedChart";
import { type TimeBasedChartTooltipData, type TooltipItem } from "webviz-core/src/components/TimeBasedChart/utils";
import filterMap from "webviz-core/src/filterMap";
import {
  type PlotPath,
  type BasePlotPath,
  isReferenceLinePlotPathType,
} from "webviz-core/src/panels/Plot/internalTypes";
import { derivative, applyToDataOrTooltips, mathFunctions } from "webviz-core/src/panels/Plot/transformPlotRange";
import { deepParse, isBobject } from "webviz-core/src/util/binaryObjects";
import { format } from "webviz-core/src/util/formatTime";
import { lightColor, lineColors } from "webviz-core/src/util/plotColors";
import { isTime, subtractTimes, toSec, formatTimeRaw } from "webviz-core/src/util/time";

export type PlotChartPoint = {|
  x: number,
  y: number,
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

export type PlotDataByPath = {
  [path: string]: $ReadOnlyArray<$ReadOnlyArray<TooltipItem>>,
};

const Y_AXIS_ID = "Y_AXIS_ID";

const isCustomScale = (xAxisVal: PlotXAxisVal): boolean => xAxisVal === "custom" || xAxisVal === "currentCustom";

function getXForPoint(
  xAxisVal: PlotXAxisVal,
  timestamp: number,
  innerIdx: number,
  xAxisRanges: ?$ReadOnlyArray<$ReadOnlyArray<TooltipItem>>,
  xItem: ?TooltipItem,
  xAxisPath: ?BasePlotPath
): number {
  if (isCustomScale(xAxisVal) && xAxisPath) {
    if (isReferenceLinePlotPathType(xAxisPath)) {
      return Number.parseFloat(xAxisPath.value);
    }
    if (xAxisRanges) {
      if (!xItem) {
        return NaN;
      }
      // It is possible that values are still bobjects at this point. Parse if needed.
      const maybeBobject = xItem.queriedData[innerIdx]?.value;
      const value = maybeBobject && isBobject(maybeBobject) ? deepParse(maybeBobject) : maybeBobject;
      return isTime(value) ? toSec((value: any)) : Number(value);
    }
  }
  return xAxisVal === "timestamp" ? timestamp : innerIdx;
}

const scaleOptions = {
  fixedYAxisWidth: 48,
  yAxisTicks: "hideFirstAndLast",
};

function getPointsAndTooltipsForMessagePathItem(
  yItem: TooltipItem,
  xItem: ?TooltipItem,
  startTime: Time,
  timestampMethod,
  path: string,
  xAxisVal: PlotXAxisVal,
  xAxisPath?: BasePlotPath,
  xAxisRanges: ?$ReadOnlyArray<$ReadOnlyArray<TooltipItem>>,
  datasetKey: string
): { points: PlotChartPoint[], tooltips: TimeBasedChartTooltipData[], hasMismatchedData: boolean } {
  const points = [];
  const tooltips = [];
  const timestamp = timestampMethod === "headerStamp" ? yItem.headerStamp : yItem.receiveTime;
  if (!timestamp) {
    return { points, tooltips, hasMismatchedData: false };
  }
  const elapsedTime = toSec(subtractTimes(timestamp, startTime));
  for (const [innerIdx, { value: maybeBobject, path: queriedPath, constantName }] of yItem.queriedData.entries()) {
    // It is possible that values are still bobjects at this point. Parse if needed.
    const value = isBobject(maybeBobject) ? deepParse(maybeBobject) : maybeBobject;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
      const valueNum = Number(value);
      if (!isNaN(valueNum)) {
        const x = getXForPoint(xAxisVal, elapsedTime, innerIdx, xAxisRanges, xItem, xAxisPath);
        const y = valueNum;
        const tooltip = { x, y, datasetKey, item: yItem, path: queriedPath, value, constantName, startTime };
        points.push({ x, y });
        tooltips.push(tooltip);
      }
    } else if (isTime(value)) {
      // $FlowFixMe - %checks on isTime can't convince Flow that the object is actually a Time. Related: https://github.com/facebook/flow/issues/3614
      const timeValue = (value: Time);
      const x = getXForPoint(xAxisVal, elapsedTime, innerIdx, xAxisRanges, xItem, xAxisPath);
      const y = toSec(timeValue);
      const tooltip = {
        x,
        y,
        datasetKey,
        item: yItem,
        path: queriedPath,
        value: `${format(timeValue)} (${formatTimeRaw(timeValue)})`,
        constantName,
        startTime,
      };
      points.push({ x, y });
      tooltips.push(tooltip);
    } else if (path.endsWith(".@length") && typeof (value: any)?.length === "number") {
      const valueNum: number = Number((value: any)?.length);
      if (!isNaN(valueNum)) {
        const x = getXForPoint(xAxisVal, elapsedTime, innerIdx, xAxisRanges, xItem, xAxisPath);
        const y = valueNum;
        const tooltip: TimeBasedChartTooltipData = {
          x,
          y,
          datasetKey,
          item: yItem,
          path: queriedPath,
          value: valueNum,
          constantName,
          startTime,
        };
        points.push({ x, y });
        tooltips.push(tooltip);
      }
    }
  }
  const hasMismatchedData =
    isCustomScale(xAxisVal) && (!xItem || yItem.queriedData.length !== xItem.queriedData.length);
  return { points, tooltips, hasMismatchedData };
}

function getDatasetAndTooltipsFromMessagePlotPath(
  path: PlotPath,
  yAxisRanges: $ReadOnlyArray<$ReadOnlyArray<TooltipItem>>,
  index: number,
  startTime: Time,
  xAxisVal: PlotXAxisVal,
  xAxisRanges: ?$ReadOnlyArray<$ReadOnlyArray<TooltipItem>>,
  xAxisPath?: BasePlotPath
): { dataset: DataSet, tooltips: TimeBasedChartTooltipData[], hasMismatchedData: boolean, path: string } {
  let showLine = true;
  const datasetKey = index.toString();

  let hasMismatchedData =
    isCustomScale(xAxisVal) &&
    xAxisRanges != null &&
    (yAxisRanges.length !== xAxisRanges.length ||
      xAxisRanges.every((range, rangeIndex) => range.length !== yAxisRanges[rangeIndex].length));
  let rangesOfTooltips: TimeBasedChartTooltipData[][] = [];
  let rangesOfPoints: PlotChartPoint[][] = [];
  for (const [rangeIdx, range] of yAxisRanges.entries()) {
    const xRange: ?$ReadOnlyArray<TooltipItem> = xAxisRanges?.[rangeIdx];
    const rangeTooltips = [];
    const rangePoints = [];
    for (const [outerIdx, item] of range.entries()) {
      const xItem: ?TooltipItem = xRange?.[outerIdx];
      const {
        points: itemPoints,
        tooltips: itemTooltips,
        hasMismatchedData: itemHasMistmatchedData,
      } = getPointsAndTooltipsForMessagePathItem(
        item,
        xItem,
        startTime,
        path.timestampMethod,
        path.value,
        xAxisVal,
        xAxisPath,
        xAxisRanges,
        datasetKey
      );
      for (const point of itemPoints) {
        rangePoints.push(point);
      }
      for (const tooltip of itemTooltips) {
        rangeTooltips.push(tooltip);
      }
      hasMismatchedData = hasMismatchedData || itemHasMistmatchedData;
      // If we have added more than one point for this message, make it a scatter plot.
      if (item.queriedData.length > 1 && xAxisVal !== "index") {
        showLine = false;
      }
    }
    rangesOfTooltips.push(rangeTooltips);
    rangesOfPoints.push(rangePoints);
  }

  if (path.value.endsWith(".@derivative")) {
    if (showLine) {
      const newRangesOfTooltips = [];
      const newRangesOfPoints = [];
      for (const [rangeIdx, rangePoints] of rangesOfPoints.entries()) {
        const rangeTooltips = rangesOfTooltips[rangeIdx];
        const { points, tooltips } = derivative(rangePoints, rangeTooltips);
        newRangesOfTooltips.push(tooltips);
        newRangesOfPoints.push(points);
      }
      rangesOfPoints = newRangesOfPoints;
      rangesOfTooltips = newRangesOfTooltips;
    } else {
      // If we have a scatter plot, we can't take the derivative, so instead show nothing
      // (nothing is better than incorrect data).
      rangesOfPoints = [];
      rangesOfTooltips = [];
    }
  }
  for (const funcName of Object.keys(mathFunctions)) {
    if (path.value.endsWith(`.@${funcName}`)) {
      rangesOfPoints = rangesOfPoints.map((points) => applyToDataOrTooltips(points, mathFunctions[funcName]));
      rangesOfTooltips = rangesOfTooltips.map((tooltips) => applyToDataOrTooltips(tooltips, mathFunctions[funcName]));
      break;
    }
  }

  // Put gaps between ranges.
  rangesOfPoints.forEach((rangePoints, i) => {
    if (i !== rangesOfPoints.length - 1) {
      // NaN points are not displayed, and result in a break in the line. A note: After this point
      // there may be fewer tooltips than points, which we rely on above. We should do this last.
      rangePoints.push({ x: NaN, y: NaN });
    }
  });

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
    data: flatten(rangesOfPoints),
  };
  return {
    dataset,
    tooltips: flatten(rangesOfTooltips),
    hasMismatchedData,
    path: path.value,
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

export function getDatasetsAndTooltips(
  paths: PlotPath[],
  itemsByPath: PlotDataByPath,
  startTime: Time,
  xAxisVal: PlotXAxisVal,
  xAxisPath?: BasePlotPath
): { datasets: DataSet[], tooltips: TimeBasedChartTooltipData[], pathsWithMismatchedDataLengths: string[] } {
  const datasetsAndTooltips = filterMap(paths, (path: PlotPath, index: number) => {
    const yRanges = itemsByPath[path.value];
    const xRanges = xAxisPath && itemsByPath[xAxisPath.value];
    if (!path.enabled) {
      return null;
    } else if (!isReferenceLinePlotPathType(path)) {
      return getDatasetAndTooltipsFromMessagePlotPath(path, yRanges, index, startTime, xAxisVal, xRanges, xAxisPath);
    }
    return null;
  });

  return {
    datasets: datasetsAndTooltips.map(({ dataset }) => dataset),
    tooltips: flatten(datasetsAndTooltips.map(({ tooltips }) => tooltips)),
    pathsWithMismatchedDataLengths: datasetsAndTooltips
      .filter(({ hasMismatchedData }) => hasMismatchedData)
      .map(({ path }) => path),
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

type PlotChartProps = {|
  paths: PlotPath[],
  minYValue: number,
  maxYValue: number,
  saveCurrentView: (minY: number, maxY: number, width: ?number) => void,
  datasets: DataSet[],
  tooltips: TimeBasedChartTooltipData[],
  xAxisVal: PlotXAxisVal,
  currentTime?: ?number,
  defaultView: ChartDefaultView,
  onClick?: ?(SyntheticMouseEvent<HTMLCanvasElement>, any, { [scaleId: string]: number }) => void,
|};
export default memo<PlotChartProps>(function PlotChart(props: PlotChartProps) {
  const {
    paths,
    currentTime,
    defaultView,
    minYValue,
    maxYValue,
    saveCurrentView,
    datasets,
    onClick,
    tooltips,
    xAxisVal,
  } = props;
  const annotations = useMemo(() => getAnnotations(paths), [paths]);
  const data = useMemo(() => ({ datasets }), [datasets]);
  const yAxes = useMemo(() => {
    const min = isNaN(minYValue) ? undefined : minYValue;
    const max = isNaN(maxYValue) ? undefined : maxYValue;
    return [
      {
        id: Y_AXIS_ID,
        ticks: {
          min,
          max,
          precision: 3,
        },
        gridLines: {
          color: "rgba(255, 255, 255, 0.2)",
          zeroLineColor: "rgba(255, 255, 255, 0.2)",
        },
      },
    ];
  }, [maxYValue, minYValue]);

  const chartRenderPath = useExperimentalFeature("useGLChartInPlotPanel") ? "webgl" : "chartjs";

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
            data={data}
            tooltips={tooltips}
            annotations={annotations}
            type="scatter"
            yAxes={yAxes}
            saveCurrentView={saveCurrentView}
            xAxisIsPlaybackTime={xAxisVal === "timestamp"}
            scaleOptions={scaleOptions}
            currentTime={currentTime}
            defaultView={defaultView}
            onClick={onClick}
            renderPath={chartRenderPath}
          />
        )}
      </Dimensions>
    </div>
  );
});
