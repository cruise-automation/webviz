// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChartJSChart from "chart.js";

import installMulticolorLineChart from "webviz-core/src/util/multicolorLineChart";

export default function installChartjs(Chart: any = ChartJSChart) {
  const annotationPlugin = require("chartjs-plugin-annotation");
  const datalabelPlugin = require("chartjs-plugin-datalabels");
  Chart.plugins.register(annotationPlugin);
  Chart.plugins.register(datalabelPlugin);
  installMulticolorLineChart(Chart);

  // Otherwise we'd get labels everywhere.
  Chart.defaults.global.plugins.datalabels = {};
  Chart.defaults.global.plugins.datalabels.display = false;

  if (Chart.plugins.count() !== 5) {
    throw new Error(
      "Incorrect number of Chart.js plugins; one probably has not loaded correctly (make sure we don't have duplicate chart.js instances when running `yarn list`."
    );
  }
}
