// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChartJSChart from "chart.js";
import { Chart as ReactChartjsChart } from "react-chartjs-2";

import installMulticolorLineChart from "webviz-core/src/util/multicolorLineChart";

export default function installChartjs(
  // By default, install chartjs for both the react-chartjs-2 version and the vanilla Chart.js version. This is so that
  // we can support switching between these two versions in screenshot tests.
  Charts: any[] = [ReactChartjsChart, ChartJSChart],
  { installZoom }: {| installZoom: boolean |} = { installZoom: true }
) {
  Charts.forEach((Chart) => {
    const annotationPlugin = require("chartjs-plugin-annotation");
    const datalabelPlugin = require("chartjs-plugin-datalabels");
    Chart.plugins.register(annotationPlugin);
    Chart.plugins.register(datalabelPlugin);
    installMulticolorLineChart(Chart);

    // Otherwise we'd get labels everywhere.
    Chart.defaults.global.plugins.datalabels = {};
    Chart.defaults.global.plugins.datalabels.display = false;

    if (installZoom) {
      const zoomPlugin = require("chartjs-plugin-zoom");
      setUpChartJSZoom(Chart);
      Chart.plugins.register(zoomPlugin);
    }

    const expectedPluginCount = installZoom ? 6 : 5;
    if (Chart.plugins.count() !== expectedPluginCount) {
      throw new Error(
        "Incorrect number of Chart.js plugins; one probably has not loaded correctly (make sure we don't have duplicate chart.js instances when running `yarn list`."
      );
    }
  });
}

const VERTICAL_EXCLUSIVE_ZOOM_KEY = "v";
const HORIZONTAL_EXCLUSIVE_ZOOM_KEY = "h";

// Set up the zoom plugin for chartjs.
function setUpChartJSZoom(Chart: any) {
  // keep track of whether the vertical or horizontal keys are being pressed.
  const pressedKeys = {};
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    [VERTICAL_EXCLUSIVE_ZOOM_KEY, HORIZONTAL_EXCLUSIVE_ZOOM_KEY].forEach((key) => {
      if (event.key && event.key.toLowerCase() === key) {
        pressedKeys[key] = true;
      }
    });
  });

  document.addEventListener("keyup", (event: KeyboardEvent) => {
    [VERTICAL_EXCLUSIVE_ZOOM_KEY, HORIZONTAL_EXCLUSIVE_ZOOM_KEY].forEach((key) => {
      if (event.key && event.key.toLowerCase() === key) {
        pressedKeys[key] = false;
      }
    });
  });

  Chart.defaults.global.plugins.zoom = {
    pan: {
      enabled: true,
      mode: "xy",
      // Taken from chartjs defaults
      speed: 20,
      threshold: 10,
    },
    zoom: {
      enabled: true,
      mode: () => {
        if (pressedKeys[VERTICAL_EXCLUSIVE_ZOOM_KEY] && pressedKeys[HORIZONTAL_EXCLUSIVE_ZOOM_KEY]) {
          return "xy";
        } else if (pressedKeys[VERTICAL_EXCLUSIVE_ZOOM_KEY]) {
          // Don't allow horizontal zooming when VERTICAL_EXCLUSIVE_ZOOM_KEY is pressed.
          return "y";
        } else if (pressedKeys[HORIZONTAL_EXCLUSIVE_ZOOM_KEY]) {
          // Don't allow vertical zooming when HORIZONTAL_EXCLUSIVE_ZOOM_KEY is pressed.
          return "x";
        }
        return "xy";
      },
      // Taken from chartjs defaults
      sensitivity: 3,
      speed: 0.1,
    },
  };
}
