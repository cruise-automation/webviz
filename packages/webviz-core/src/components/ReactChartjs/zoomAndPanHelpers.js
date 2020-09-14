// @flow

// This code is mostly forked from chartjs-plugin-zoom, with the goal of splitting the DOM access and the chart access
// so that we can move Chart.js behind a web worker.
// Link: https://github.com/chartjs/chartjs-plugin-zoom/tree/6a97a22b99e0325597b7bd7b38b083dde4949a60

// The MIT License (MIT)
// Copyright (c) 2013-2016 Nick Downie

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
// Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/* eslint-disable header/header */

import cloneDeep from "lodash/cloneDeep";

import { objectValues } from "webviz-core/src/util";

export type ZoomOptions = $ReadOnly<{
  mode: "xy" | "x" | "y",
  enabled: boolean,
  speed: number,
  sensitivity: number,
}>;
export type PanOptions = $ReadOnly<{
  mode: "xy" | "x" | "y",
  enabled: boolean,
  speed: number,
  threshold: number,
}>;
export type ScaleBounds = {|
  id: string,
  min: number,
  max: number,
  axes: "xAxes" | "yAxes",
  // Axis coordinates are measured in pixels from the edge of the chart canvas (vertically when axes
  // is "yAxes", horizontally when axes is "xAxes".)
  minAlongAxis: number,
  maxAlongAxis: number,
|};

type ChartInstance = any;

// ZOOM FUNCTIONS

const zoomCumulativeDeltaByChartId = {};

function zoomCategoryScale(scale, zoom, center, zoomOptions, chartId) {
  const labels = scale.chart.data.labels;
  let minIndex = scale.minIndex;
  const lastLabelIndex = labels.length - 1;
  let maxIndex = scale.maxIndex;
  const sensitivity = zoomOptions.sensitivity;
  const chartCenter = scale.isHorizontal() ? scale.left + scale.width / 2 : scale.top + scale.height / 2;
  const centerPointer = scale.isHorizontal() ? center.x : center.y;

  zoomCumulativeDeltaByChartId[chartId] = zoomCumulativeDeltaByChartId[chartId] || 0;
  zoomCumulativeDeltaByChartId[chartId] =
    zoom > 1 ? zoomCumulativeDeltaByChartId[chartId] + 1 : zoomCumulativeDeltaByChartId[chartId] - 1;

  if (Math.abs(zoomCumulativeDeltaByChartId[chartId]) > sensitivity) {
    if (zoomCumulativeDeltaByChartId[chartId] < 0) {
      if (centerPointer >= chartCenter) {
        if (minIndex <= 0) {
          maxIndex = Math.min(lastLabelIndex, maxIndex + 1);
        } else {
          minIndex = Math.max(0, minIndex - 1);
        }
      } else if (centerPointer < chartCenter) {
        if (maxIndex >= lastLabelIndex) {
          minIndex = Math.max(0, minIndex - 1);
        } else {
          maxIndex = Math.min(lastLabelIndex, maxIndex + 1);
        }
      }
      zoomCumulativeDeltaByChartId[chartId] = 0;
    } else if (zoomCumulativeDeltaByChartId[chartId] > 0) {
      if (centerPointer >= chartCenter) {
        minIndex = minIndex < maxIndex ? (minIndex = Math.min(maxIndex, minIndex + 1)) : minIndex;
      } else if (centerPointer < chartCenter) {
        maxIndex = maxIndex > minIndex ? (maxIndex = Math.max(minIndex, maxIndex - 1)) : maxIndex;
      }
      zoomCumulativeDeltaByChartId[chartId] = 0;
    }
    scale.options.ticks.min = labels[minIndex];
    scale.options.ticks.max = labels[maxIndex];
  }
}

function zoomNumericalScale(scale, zoom, center) {
  const range = scale.max - scale.min;
  const newDiff = range * (zoom - 1);

  const centerPoint = scale.isHorizontal() ? center.x : center.y;
  const minPercent = (scale.getValueForPixel(centerPoint) - scale.min) / range;
  const maxPercent = 1 - minPercent;

  const minDelta = newDiff * minPercent;
  const maxDelta = newDiff * maxPercent;

  scale.options.ticks.min = scale.min + minDelta;
  scale.options.ticks.max = scale.max - maxDelta;
}

function zoomTimeScale(scale, zoom, center) {
  zoomNumericalScale(scale, zoom, center);

  const options = scale.options;
  if (options.time) {
    if (options.time.min) {
      options.time.min = options.ticks.min;
    }
    if (options.time.max) {
      options.time.max = options.ticks.max;
    }
  }
}

const zoomFunctions = {
  category: zoomCategoryScale,
  time: zoomTimeScale,
  linear: zoomNumericalScale,
  logarithmic: zoomNumericalScale,
};

function zoomScale(scale, zoom, center, zoomOptions, chartId) {
  const fn = zoomFunctions[scale.type];
  if (fn) {
    fn(scale, zoom, center, zoomOptions, chartId);
  }
}

const originalOptionsByChartId = {};

function storeOriginalOptions(chartId: string, chart: ChartInstance) {
  originalOptionsByChartId[chartId] = originalOptionsByChartId[chartId] || {};
  objectValues(chart.scales).forEach(({ id, options }) => {
    if (!originalOptionsByChartId[chartId][id]) {
      originalOptionsByChartId[chartId][id] = cloneDeep(options);
    }
  });
  Object.keys(originalOptionsByChartId[chartId]).forEach((key) => {
    if (!chart.scales[key]) {
      delete originalOptionsByChartId[chartId][key];
    }
  });
}

function directionEnabled(mode, dir) {
  if (mode === undefined) {
    return true;
  } else if (typeof mode === "string") {
    return mode.indexOf(dir) !== -1;
  }

  return false;
}

export function doZoom(
  chartId: string,
  chartInstance: ChartInstance,
  zoomOptions: ZoomOptions,
  percentZoomX: number,
  percentZoomY: number,
  focalPoint?: { x: number, y: number },
  whichAxesParam?: string
) {
  const ca = chartInstance.chartArea;

  if (!focalPoint) {
    focalPoint = {
      x: (ca.left + ca.right) / 2,
      y: (ca.top + ca.bottom) / 2,
    };
  }

  if (zoomOptions.enabled) {
    storeOriginalOptions(chartId, chartInstance);
    // Do the zoom here
    const zoomMode = zoomOptions.mode;

    // Which axe should be modified when fingers were used.
    let whichAxes;
    if (zoomOptions.mode === "xy" && whichAxes !== undefined) {
      // based on fingers positions
      whichAxes = whichAxesParam;
    } else {
      // no effect
      whichAxes = "xy";
    }

    Object.keys(chartInstance.scales).forEach((scaleKey) => {
      const scale = chartInstance.scales[scaleKey];
      if (scale.isHorizontal() && directionEnabled(zoomMode, "x") && directionEnabled(whichAxes, "x")) {
        zoomScale(scale, percentZoomX, focalPoint, zoomOptions, chartId);
      } else if (!scale.isHorizontal() && directionEnabled(zoomMode, "y") && directionEnabled(whichAxes, "y")) {
        zoomScale(scale, percentZoomY, focalPoint, zoomOptions, chartId);
      }
    });

    chartInstance.update(0);
  }
}

export function resetZoomDelta(chartId: string) {
  zoomCumulativeDeltaByChartId[chartId] = 0;
}

// PAN OPTIONS

const panCumulativeDeltaByChartId = {};

function panCategoryScale(scale, delta, panOptions, chartId) {
  const labels = scale.chart.data.labels;
  const lastLabelIndex = labels.length - 1;
  const offsetAmt = Math.max(scale.ticks.length, 1);
  const panSpeed = panOptions.speed;
  let minIndex = scale.minIndex;
  const step = Math.round(scale.width / (offsetAmt * panSpeed));

  panCumulativeDeltaByChartId[chartId] = panCumulativeDeltaByChartId[chartId] || 0;
  panCumulativeDeltaByChartId[chartId] += delta;

  minIndex =
    panCumulativeDeltaByChartId[chartId] > step
      ? Math.max(0, minIndex - 1)
      : panCumulativeDeltaByChartId[chartId] < -step
      ? Math.min(lastLabelIndex - offsetAmt + 1, minIndex + 1)
      : minIndex;
  panCumulativeDeltaByChartId[chartId] = minIndex !== scale.minIndex ? 0 : panCumulativeDeltaByChartId[chartId];

  const maxIndex = Math.min(lastLabelIndex, minIndex + offsetAmt - 1);

  scale.options.ticks.min = labels[minIndex];
  scale.options.ticks.max = labels[maxIndex];
}

function panNumericalScale(scale, delta) {
  const tickOpts = scale.options.ticks;
  const prevStart = scale.min;
  const prevEnd = scale.max;
  let newMin = scale.getValueForPixel(scale.getPixelForValue(prevStart) - delta);
  let newMax = scale.getValueForPixel(scale.getPixelForValue(prevEnd) - delta);
  // The time scale returns date objects so convert to numbers. Can remove at Chart.js v3
  newMin = newMin.valueOf ? newMin.valueOf() : newMin;
  newMax = newMax.valueOf ? newMax.valueOf() : newMax;
  tickOpts.min = newMin;
  tickOpts.max = newMax;
}

function panTimeScale(scale, delta) {
  panNumericalScale(scale, delta);

  const options = scale.options;
  if (options.time) {
    if (options.time.min) {
      options.time.min = options.ticks.min;
    }
    if (options.time.max) {
      options.time.max = options.ticks.max;
    }
  }
}

const panFunctions = {
  category: panCategoryScale,
  time: panTimeScale,
  linear: panNumericalScale,
  logarithmic: panNumericalScale,
};

function panScale(scale, delta, panOptions, chartId) {
  const fn = panFunctions[scale.type];
  if (fn) {
    fn(scale, delta, panOptions, chartId);
  }
}

export function doPan(
  chartId: string,
  chartInstance: ChartInstance,
  panOptions: PanOptions,
  deltaX: number,
  deltaY: number
) {
  storeOriginalOptions(chartId, chartInstance);
  if (panOptions.enabled) {
    const panMode = panOptions.mode;

    Object.keys(chartInstance.scales).forEach((scaleKey) => {
      const scale = chartInstance.scales[scaleKey];
      if (scale.isHorizontal() && directionEnabled(panMode, "x") && deltaX !== 0) {
        panScale(scale, deltaX, panOptions, chartId);
      } else if (!scale.isHorizontal() && directionEnabled(panMode, "y") && deltaY !== 0) {
        panScale(scale, deltaY, panOptions, chartId);
      }
    });

    chartInstance.update(0);
  }
}

export function resetPanDelta(chartId: string) {
  panCumulativeDeltaByChartId[chartId] = 0;
}

export function resetZoom(chartId: string, chartInstance: ChartInstance) {
  storeOriginalOptions(chartId, chartInstance);
  const originalOptions = originalOptionsByChartId[chartId];
  Object.keys(chartInstance.scales).forEach((scaleKey) => {
    const scale = chartInstance.scales[scaleKey];
    const timeOptions = scale.options.time;
    const tickOptions = scale.options.ticks;

    if (originalOptions[scale.id]) {
      if (timeOptions) {
        timeOptions.min = originalOptions[scale.id].time.min;
        timeOptions.max = originalOptions[scale.id].time.max;
      }

      if (tickOptions) {
        tickOptions.min = originalOptions[scale.id].ticks.min;
        tickOptions.max = originalOptions[scale.id].ticks.max;
      }
    } else {
      if (timeOptions) {
        delete timeOptions.min;
        delete timeOptions.max;
      }

      if (tickOptions) {
        delete tickOptions.min;
        delete tickOptions.max;
      }
    }
  });

  chartInstance.update();
}

// MISC

export function wheelZoomHandler(event: SyntheticWheelEvent<HTMLCanvasElement>, zoomOptions: ZoomOptions) {
  const rect = event.currentTarget.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;

  const center = { x: offsetX, y: offsetY };

  let speedPercent = zoomOptions.speed;

  if (event.deltaY >= 0) {
    speedPercent = -speedPercent;
  }

  // Prevent the event from triggering the default behavior (eg. Content scrolling).
  if (event.cancelable) {
    event.preventDefault();
  }

  return {
    percentZoomX: 1 + speedPercent,
    percentZoomY: 1 + speedPercent,
    focalPoint: center,
  };
}

export function getScaleBounds(chartInstance: ChartInstance): ScaleBounds[] {
  const xAxisScales = chartInstance.options.scales.xAxes.map(({ id }) => id);
  return Object.keys(chartInstance.scales).map((scaleKey) => {
    const scale = chartInstance.scales[scaleKey];
    const { min, max } = scale;

    let minAlongAxis;
    let maxAlongAxis;
    let axes;
    if (xAxisScales.includes(scale.id)) {
      minAlongAxis = scale.left;
      maxAlongAxis = scale.right;
      axes = "xAxes";
    } else {
      minAlongAxis = scale.bottom;
      maxAlongAxis = scale.top;
      axes = "yAxes";
    }

    return { id: scale.id, axes, min, max, minAlongAxis, maxAlongAxis };
  });
}

export function getChartValue(bounds: ?ScaleBounds, canvasPx: number): ?number {
  if (bounds == null) {
    return;
  }
  const { min, max, minAlongAxis, maxAlongAxis } = bounds;
  const chartOffsetPx = canvasPx - minAlongAxis;
  return min + (chartOffsetPx * (max - min)) / (maxAlongAxis - minAlongAxis);
}

export function getChartPx(bounds: ?ScaleBounds, value: number): ?number {
  if (bounds == null) {
    return;
  }
  const { min, max, minAlongAxis, maxAlongAxis } = bounds;
  // If [min, value, max] = [5, 7, 10], then valuePercent is 2/5 = 0.4.
  const valuePercent = (value - min) / (max - min);
  // If the chart goes from 104px to 154px, a bar at 40% should be at 104 + 20px.
  return minAlongAxis + valuePercent * (maxAlongAxis - minAlongAxis);
}

export function inBounds(position: number, bounds: ?ScaleBounds): boolean {
  if (bounds == null) {
    return false;
  }
  // The position of the minimum value may not be the minimum coordinate if the axis is reversed.
  const minBound = Math.min(bounds.minAlongAxis, bounds.maxAlongAxis);
  const maxBound = Math.max(bounds.minAlongAxis, bounds.maxAlongAxis);
  return position >= minBound && position <= maxBound;
}
