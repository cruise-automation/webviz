// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart/utils";
import type { PlotChartPoint } from "webviz-core/src/panels/Plot/PlotChart";
import {
  METERS_PER_SECOND_TO_KILOMETERS_PER_HOUR,
  METERS_PER_SECOND_TO_MILES_PER_HOUR,
  MILES_PER_HOUR_TO_METERS_PER_SECOND,
  MILES_PER_HOUR_TO_KILOMETERS_PER_HOUR,
} from "webviz-core/src/util/globalConstants";

export function derivative(
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

export const mathFunctions = {
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  ceil: Math.ceil,
  cos: Math.cos,
  log: Math.log,
  log1p: Math.log1p,
  log2: Math.log2,
  log10: Math.log10,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
  trunc: Math.trunc,
  negative: (value: number) => -value,
  deg2rad: (degrees: number) => degrees * (Math.PI / 180),
  rad2deg: (radians: number) => radians * (180 / Math.PI),
  mps2kph: (metersPerSecond: number) => metersPerSecond * METERS_PER_SECOND_TO_KILOMETERS_PER_HOUR,
  kph2mps: (kmPerHour: number) => kmPerHour / METERS_PER_SECOND_TO_KILOMETERS_PER_HOUR,
  mps2mph: (metersPerSecond: number) => metersPerSecond * METERS_PER_SECOND_TO_MILES_PER_HOUR,
  mph2mps: (milesPerHour: number) => milesPerHour * MILES_PER_HOUR_TO_METERS_PER_SECOND,
  mph2kph: (milesPerHour: number) => milesPerHour * MILES_PER_HOUR_TO_KILOMETERS_PER_HOUR,
  kph2mph: (kmPerHour: number) => kmPerHour / MILES_PER_HOUR_TO_KILOMETERS_PER_HOUR,
};

// Apply a function to the y-value of the data or tooltips passed in.
export function applyToDataOrTooltips<T>(dataOrTooltips: T[], func: (number) => number): T[] {
  return dataOrTooltips.map((item) => {
    // $FlowFixMe
    let y: number | string = item.y;
    const numericYValue: number = Number(y);
    // Only apply the function if the Y value is a valid number.
    if (!isNaN(numericYValue)) {
      y = func(numericYValue);
    }
    return { ...item, y };
  });
}
