// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Chart from "chart.js";
import keyBy from "lodash/keyBy";
import omit from "lodash/omit";

import {
  type ZoomOptions,
  type PanOptions,
  doZoom,
  doPan,
  resetPanDelta,
  resetZoomDelta,
  resetZoom,
  getScaleBounds,
} from "./zoomAndPanHelpers";

type XAxisTicks = "follow" | "displayXAxesTicksInSeconds";

// These are options that we pass our worker. We have to pass this as a separate object instead of as part of the
// config because they can only be set using a callback function, which we can't pass across worker boundaries.
export type ScaleOptions = {|
  // Sets y-axis labels to a fixed width, so that vertically-aligned charts can be directly compared.
  fixedYAxisWidth?: ?number,
  // We might want to hide just the first and last because they can overlap with other labels or have long decimal
  // points.
  yAxisTicks?: "show" | "hide" | "hideFirstAndLast",
  // Display the x-axes with a seconds unit, eg "1 s"
  xAxisTicks?: ?XAxisTicks,
|};

function hideAllTicksScaleCallback() {
  return "";
}

// exported for tests
export function printShortNumber(value: number) {
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) >= 100000 || Math.abs(value) < 0.00001) {
    // Force scientific notation for large and small numbers. Don't allow too many significant
    // figures.
    return Number.parseFloat(value.toPrecision(3))
      .toExponential()
      .replace("+", ""); // The "+" in "1.0e+10" just takes up space.
  }
  // Truncate the decimal representation based on the length of the whole-number part.
  // For implementation simplicity don't count an extra digit for a leading "-".
  const truncatedLength = Math.trunc(Math.abs(value)).toString().length;
  // Values with length more than 6 will be in scientific notation, but clamp to zero just to be
  // safe.
  const decimalDigits = Math.max(0, 6 - truncatedLength);
  return `${Math.round(value * 10 ** decimalDigits) / 10 ** decimalDigits}`;
}

function hideFirstAndLastTicksScaleCallback(value: number, index: number, values: number[]) {
  if (index === 0 || index === values.length - 1) {
    // First and last labels sometimes get super long rounding errors when zooming.
    // This fixes that.
    return "";
  }
  return printShortNumber(value);
}

function displayTicksInSecondsCallback(value: number) {
  return `${Math.round(value * 1000) / 1000} s`;
}

function mapChartElementToEventElement(chartInstance, item) {
  return {
    // It's annoying to have to rely on internal APIs like this, but there's literally no other way and the help
    // documents themselves say to do this: https://www.chartjs.org/docs/latest/developers/api.html#getelementatevente
    // eslint-disable-next-line no-underscore-dangle
    data: chartInstance.data.datasets[item._datasetIndex]?.data[item._index],
    // eslint-disable-next-line no-underscore-dangle
    view: item._view,
  };
}

const datasetKeyProvider = (d) => d.label;

type ChartInstance = any;
// This type is not yet in Flow, so temporarily type it this way.
type OffscreenCanvas = HTMLCanvasElement;

export default class ChartJSManager {
  id: string;
  _node: OffscreenCanvas;
  _chartInstance: ?ChartInstance;

  constructor({
    id,
    node,
    type,
    data,
    options,
    scaleOptions,
    devicePixelRatio,
  }: {
    id: string,
    node: OffscreenCanvas,
    type: any,
    data: any,
    options: any,
    scaleOptions: ?ScaleOptions,
    devicePixelRatio: number,
  }) {
    this.id = id;
    this._node = node;
    const plugins = {};
    const chartInstance = new Chart(node, {
      type,
      data,
      options: { ...this._addFunctionsToConfig(options, scaleOptions), devicePixelRatio },
      plugins,
    });
    this._chartInstance = chartInstance;
  }

  getScaleBounds() {
    const chartInstance = this._chartInstance;
    if (!chartInstance) {
      return;
    }

    return getScaleBounds(chartInstance);
  }

  doZoom({
    zoomOptions,
    percentZoomX,
    percentZoomY,
    focalPoint,
    whichAxesParam,
  }: {
    zoomOptions: ZoomOptions,
    percentZoomX: number,
    percentZoomY: number,
    focalPoint?: { x: number, y: number },
    whichAxesParam?: string,
  }) {
    const chartInstance = this._chartInstance;
    if (!chartInstance) {
      return;
    }

    doZoom(this.id, chartInstance, zoomOptions, percentZoomX, percentZoomY, focalPoint, whichAxesParam);
    return getScaleBounds(chartInstance);
  }

  resetZoomDelta() {
    const chartInstance = this._chartInstance;
    if (!chartInstance) {
      return;
    }

    resetZoomDelta(this.id);
  }

  doPan({ panOptions, deltaX, deltaY }: { panOptions: PanOptions, deltaX: number, deltaY: number }) {
    const chartInstance = this._chartInstance;
    if (!chartInstance) {
      return;
    }

    doPan(this.id, chartInstance, panOptions, deltaX, deltaY);
    return getScaleBounds(chartInstance);
  }

  resetPanDelta() {
    resetPanDelta(this.id);
  }

  update({ data, options, scaleOptions }: { data: any, options: any, scaleOptions: ?ScaleOptions }) {
    const chartInstance = this._chartInstance;

    if (!chartInstance) {
      return;
    }

    if (options) {
      options = this._addFunctionsToConfig(options, scaleOptions);
      chartInstance.options = Chart.helpers.configMerge(chartInstance.options, options);
    }

    // Pipe datasets to chart instance datasets enabling
    // seamless transitions
    const currentDatasets = this._getCurrentDatasets();
    const nextDatasets = (data && data.datasets) || [];
    this._checkDatasets(currentDatasets);

    const currentDatasetsIndexed = keyBy(currentDatasets, datasetKeyProvider);

    // We can safely replace the dataset array, as long as we retain the _meta property
    // on each dataset.
    chartInstance.config.data.datasets = nextDatasets.map((next) => {
      const current = currentDatasetsIndexed[datasetKeyProvider(next)];

      if (current && current.type === next.type && next.data) {
        // Be robust to no data. Relevant for other update mechanisms as in chartjs-plugin-streaming.
        // The data array must be edited in place. As chart.js adds listeners to it.
        current.data.splice(next.data.length);
        next.data.forEach((point, pid) => {
          current.data[pid] = next.data[pid];
        });
        const otherDatasetProps = omit(next, "data");
        // Merge properties. Notice a weakness here. If a property is removed
        // from next, it will be retained by current and never disappears.
        // Workaround is to set value to null or undefined in next.
        return {
          ...current,
          ...otherDatasetProps,
        };
      }
      return next;
    });

    const otherDataProps = omit(data, "datasets");

    chartInstance.config.data = {
      ...chartInstance.config.data,
      ...otherDataProps,
    };

    chartInstance.update();

    return getScaleBounds(chartInstance);
  }

  resetZoom() {
    const chartInstance = this._chartInstance;
    if (chartInstance) {
      resetZoom(this.id, chartInstance);
    }

    return getScaleBounds(chartInstance);
  }

  destroy() {
    const chartInstance = this._chartInstance;
    if (chartInstance) {
      chartInstance.destroy();
    }
    this._chartInstance = null;
  }

  // Get the closest element at the same x-axis value as the cursor.
  // This is a somewhat complex function because we attempt to copy the same behavior that the built-in tooltips have
  // for Chart.js without a direct API for it.
  getElementAtXAxis({ event }: { event: Event }) {
    const chartInstance = this._chartInstance;
    if (chartInstance) {
      // Elements directly under the cursor.
      const pointElements = chartInstance.getElementsAtEventForMode(event, "point");

      if (pointElements.length) {
        // If we have an element directly under the cursor, return it.
        return mapChartElementToEventElement(chartInstance, pointElements[0]);
      }

      // Elements near the x-axis position of the cursor.
      const xAxisElements = chartInstance.getElementsAtEventForMode(event, "x", { intersect: false });
      if (xAxisElements.length) {
        // The nearest elements to the cursor, regardless of how close they are.
        const nearestElements = chartInstance.getElementsAtEventForMode(event, "nearest", { intersect: false });
        const nearestXAxisElement = nearestElements.find((item) =>
          // eslint-disable-next-line no-underscore-dangle
          xAxisElements.some((item2) => item._index === item2._index && item._datasetIndex === item2._datasetIndex)
        );
        // If we have elements on the x-axis, return the nearest element if we can find it.
        if (nearestXAxisElement) {
          return mapChartElementToEventElement(chartInstance, nearestXAxisElement);
        }
        // Otherwise just return the first element on the x-axis.
        return mapChartElementToEventElement(chartInstance, xAxisElements[0]);
      }
    }
  }

  getDatalabelAtEvent({ event }: { event: Event }) {
    const chartInstance = this._chartInstance;
    if (chartInstance) {
      const chartDatalabel = chartInstance.$datalabels.getLabelAtEvent(event);
      if (chartDatalabel) {
        const context = chartDatalabel.$context;
        return context.dataset.data[context.dataIndex];
      }
    }
  }

  _addFunctionsToConfig(config: any, scaleOptions: ?ScaleOptions) {
    if (config && config.plugins.datalabels) {
      // This controls which datalabels are displayed. Only display labels for datapoints that include a "label"
      // property.
      config.plugins.datalabels.formatter = (value: any, _context: any) => {
        const label = value?.label;
        // We have to return "null" if we don't want this label to be displayed. Returning "undefined" falls back to the
        // default formatting.
        return label != null ? label : null;
      };
      // Override color so that it can be set per-dataset.
      const staticColor = config.plugins.datalabels.color || "white";
      config.plugins.datalabels.color = (context: any) => {
        const value = context.dataset.data[context.dataIndex];
        return value?.labelColor || staticColor;
      };
    }

    if (scaleOptions) {
      for (const scale of config.scales.yAxes) {
        if (scaleOptions.fixedYAxisWidth != null) {
          scale.afterFit = (scaleInstance: any) => {
            scaleInstance.width = scaleOptions.fixedYAxisWidth;
          };
        }
        scale.ticks = scale.ticks || {};
        if (scaleOptions.yAxisTicks === "hide") {
          scale.ticks.callback = hideAllTicksScaleCallback;
        } else if (scaleOptions.yAxisTicks === "hideFirstAndLast") {
          scale.ticks.callback = hideFirstAndLastTicksScaleCallback;
        }
      }

      for (const scale of config.scales.xAxes) {
        scale.ticks = scale.ticks || {};
        if (scaleOptions.xAxisTicks) {
          if (scaleOptions.xAxisTicks === "displayXAxesTicksInSeconds") {
            scale.ticks.callback = displayTicksInSecondsCallback;
          } else {
            scale.ticks.callback = hideFirstAndLastTicksScaleCallback;
          }
        }
      }
    }

    return config;
  }

  _checkDatasets(datasets: any[]) {
    const isDev = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "prod";
    const multipleDatasets = datasets.length > 1;

    if (isDev && multipleDatasets) {
      let shouldWarn = false;
      datasets.forEach((dataset) => {
        if (!dataset.label) {
          shouldWarn = true;
        }
      });

      if (shouldWarn) {
        console.error(
          '[ChartJSManager] Warning: Each dataset needs a unique key. By default, the "label" property on each dataset is used.'
        );
      }
    }
  }

  _getCurrentDatasets() {
    return (this._chartInstance && this._chartInstance.config.data && this._chartInstance.config.data.datasets) || [];
  }
}
