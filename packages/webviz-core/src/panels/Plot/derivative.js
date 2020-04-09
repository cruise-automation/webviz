// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart";
import type { PlotChartPoint } from "webviz-core/src/panels/Plot/PlotChart";

export default function derivative(
  data: PlotChartPoint[],
  tooltips: TimeBasedChartTooltipData[]
): { points: PlotChartPoint[], tooltips: TimeBasedChartTooltipData[] } {
  const points = [];
  const newTooltips = [];
  for (let i = 1; i < data.length; i++) {
    const secondsDifference = data[i].x - data[i - 1].x;
    const value = (data[i].y - data[i - 1].y) / secondsDifference;
    const previousTooltip = tooltips[i];
    const point: PlotChartPoint = { x: data[i].x, y: value };
    const tooltip = {
      x: point.x,
      y: point.y,
      item: previousTooltip.item,
      path: `${previousTooltip.path}.@derivative`,
      datasetKey: previousTooltip.datasetKey,
      value,
      constantName: undefined,
      startTime: previousTooltip.startTime,
    };
    newTooltips.push(tooltip);
    points.push(point);
  }
  return { points, tooltips: newTooltips };
}
