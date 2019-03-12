// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Chart } from "react-chartjs-2";

export default function installChartjs() {
  // These have the side effect of installing themselves.
  require("chartjs-plugin-annotation");
  require("chartjs-plugin-datalabels");
  require("chartjs-plugin-zoom");
  require("webviz-core/src/util/multicolorLineChart");

  // Otherwise we'd get labels everywhere.
  Chart.defaults.global.plugins.datalabels.display = false;

  if (Chart.plugins.count() !== 6) {
    throw new Error(
      "Incorrect number of Chart.js plugins; one probably has not loaded correctly (make sure we don't have duplicate chart.js instances when running `yarn list`."
    );
  }
}
