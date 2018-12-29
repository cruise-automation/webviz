// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { PlotChartPoint } from "webviz-core/src/panels/Plot/PlotChart";

export default function derivative(data: PlotChartPoint[]): PlotChartPoint[] {
  const newData = [];
  for (let i = 1; i < data.length; i++) {
    const secondsDifference = data[i].x - data[i - 1].x;
    const value = (data[i].y - data[i - 1].y) / secondsDifference;
    newData.push({
      x: data[i].x,
      y: value,
      tooltip: {
        item: data[i].tooltip.item,
        path: `${data[i].tooltip.path}.@derivative`,
        value,
        constantName: undefined,
        startTime: data[i].tooltip.startTime,
      },
    });
  }
  return newData;
}
