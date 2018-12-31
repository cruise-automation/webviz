// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

let lastTicks;
let result;

export default function labelVisibilityMap(context: any, measureText: (string) => number): boolean[][] {
  if (lastTicks !== context.chart.scales["x-axis-1"].ticks) {
    lastTicks = context.chart.scales["x-axis-1"].ticks;
    result = context.chart.data.datasets.map((dataset, datasetIndex) => {
      const { data } = dataset;
      const shownLabels = new Array(data.length).fill(false);
      let lastChangedLabelX;
      for (let index = data.length - 1; index >= 0; index--) {
        if (index === 0 || data[index].label !== data[index - 1].label) {
          const x = context.chart.scales["x-axis-1"].getPixelForValue(data[index].x);
          if (lastChangedLabelX === undefined || x + measureText(data[index].label) < lastChangedLabelX) {
            shownLabels[index] = true;
          }
          lastChangedLabelX = x;
        }
      }
      return shownLabels;
    });
  }
  return result;
}
