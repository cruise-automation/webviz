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

  setUpChartJSZoom();

  if (Chart.plugins.count() !== 6) {
    throw new Error(
      "Incorrect number of Chart.js plugins; one probably has not loaded correctly (make sure we don't have duplicate chart.js instances when running `yarn list`."
    );
  }
}

const VERTICAL_EXCLUSIVE_ZOOM_KEY = "v";
const HORIZONTAL_EXCLUSIVE_ZOOM_KEY = "h";

// Set up the zoom plugin for chartjs.
function setUpChartJSZoom() {
  // keep track of whether the vertical or horizontal keys are being pressed.
  const pressedKeys = {};
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    [VERTICAL_EXCLUSIVE_ZOOM_KEY, HORIZONTAL_EXCLUSIVE_ZOOM_KEY].forEach((key) => {
      if (event.key.toLowerCase() === key) {
        pressedKeys[key] = true;
      }
    });
  });

  document.addEventListener("keyup", (event: KeyboardEvent) => {
    [VERTICAL_EXCLUSIVE_ZOOM_KEY, HORIZONTAL_EXCLUSIVE_ZOOM_KEY].forEach((key) => {
      if (event.key.toLowerCase() === key) {
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
      mode: "xy",
      // Taken from chartjs defaults
      sensitivity: 3,
      speed: 0.1,
      isModeEnabledOverrideFn: (_event: ?Event, direction: "x" | "y"): boolean => {
        if (pressedKeys[VERTICAL_EXCLUSIVE_ZOOM_KEY] && pressedKeys[HORIZONTAL_EXCLUSIVE_ZOOM_KEY]) {
          return true;
        } else if (pressedKeys[VERTICAL_EXCLUSIVE_ZOOM_KEY] && direction === "x") {
          // Don't allow horizontal zooming when VERTICAL_EXCLUSIVE_ZOOM_KEY is pressed.
          return false;
        } else if (pressedKeys[HORIZONTAL_EXCLUSIVE_ZOOM_KEY] && direction === "y") {
          // Don't allow vertical zooming when HORIZONTAL_EXCLUSIVE_ZOOM_KEY is pressed.
          return false;
        }
        return true;
      },
    },
  };
}
