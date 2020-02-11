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
} from "webviz-core/src/components/ReactChartjs/zoomAndPanHelpers";

const datasetKeyProvider = (d) => d.label;

type ChartInstance = any;
// This type is not yet in Flow, so temporarily type it this way.
type OffscreenCanvas = HTMLCanvasElement;

export default class ChartJSManager {
  id: string;
  _chartInstance: ?ChartInstance;
  _memoizedData: any;
  _datasets: any;

  constructor({
    id,
    node,
    type,
    data,
    options,
  }: {
    id: string,
    node: OffscreenCanvas,
    type: any,
    data: any,
    options: any,
  }) {
    this.id = id;
    const plugins = {};
    data = this._memoizeDataProps(data);
    const chartInstance = new Chart(node, {
      type,
      data,
      options,
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

  update({ data, options }: { data: any, options: any }) {
    const chartInstance = this._chartInstance;
    data = this._memoizeDataProps(data);

    if (!chartInstance) {
      return;
    }

    if (options) {
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
    this._saveCurrentDatasets();
    const datasets = Object.values(this._datasets);
    if (chartInstance) {
      chartInstance.config.data.datasets = datasets;
      chartInstance.destroy();
    }
    this._chartInstance = null;
  }

  getElementAtEvent({ event }: { event: Event }) {
    const chartInstance = this._chartInstance;
    if (chartInstance) {
      return chartInstance.getElementAtEvent(event).map((item) => ({
        // It's annoying to have to rely on internal APIs like this, but there's literally no other way and the help
        // documents themselves say to do this: https://www.chartjs.org/docs/latest/developers/api.html#getelementatevente
        // eslint-disable-next-line no-underscore-dangle
        data: chartInstance.data.datasets[item._datasetIndex]?.data[item._index],
        // eslint-disable-next-line no-underscore-dangle
        view: item._view,
      }));
    }
  }

  // Chart.js directly mutates the data.dataset objects by adding _meta proprerty
  // this makes impossible to compare the current and next data changes
  // therefore we memoize the data prop while sending a fake to Chart.js for mutation.
  // see https://github.com/chartjs/Chart.js/blob/master/src/core/core.controller.js#L615-L617
  _memoizeDataProps(data: any) {
    if (!data) {
      return;
    }

    this._memoizedData = {
      ...data,
      datasets:
        data.datasets &&
        data.datasets.map((set) => {
          return {
            ...set,
          };
        }),
    };

    this._saveCurrentDatasets(); // to remove the dataset metadata from this chart when the chart is destroyed

    return data;
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
          '[react-chartjs-2] Warning: Each dataset needs a unique key. By default, the "label" property on each dataset is used. Alternatively, you may provide a "datasetKeyProvider" as a prop that returns a unique key.'
        );
      }
    }
  }

  _getCurrentDatasets() {
    return (this._chartInstance && this._chartInstance.config.data && this._chartInstance.config.data.datasets) || [];
  }

  _saveCurrentDatasets() {
    this._datasets = this._datasets || {};
    const currentDatasets = this._getCurrentDatasets();
    currentDatasets.forEach((d) => {
      this._datasets[datasetKeyProvider(d)] = d;
    });
  }
}
