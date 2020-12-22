// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { derivative, applyToDataOrTooltips, mathFunctions } from "./transformPlotRange";
import { type TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart";

describe("transformPlotRange", () => {
  describe("derivative", () => {
    it("takes the derivative using the previous message", () => {
      const headerStamp = undefined;
      const receiveTime = { sec: 123, nsec: 456 };
      const tooltips = [
        {
          x: 0,
          y: 0,
          datasetKey: "0",
          value: 0,
          item: {
            headerStamp,
            receiveTime,
            queriedData: [{ value: 0, path: "/some/topic.something", constantName: undefined }],
          },
          path: "/some/topic.something",
          constantName: undefined,
          startTime: { sec: 0, nsec: 0 },
        },
        {
          x: 1,
          y: -1,
          datasetKey: "0",
          value: -1,
          item: {
            headerStamp,
            receiveTime,
            queriedData: [{ value: -1, path: "/some/topic.something", constantName: undefined }],
          },
          path: "/some/topic.something",
          constantName: undefined,
          startTime: { sec: 0, nsec: 0 },
        },
        {
          x: 2,
          y: -1.5,
          datasetKey: "0",
          value: -1.5,
          item: {
            headerStamp,
            receiveTime,
            queriedData: [{ value: -1.5, path: "/some/topic.something", constantName: undefined }],
          },
          path: "/some/topic.something",
          constantName: undefined,
          startTime: { sec: 0, nsec: 0 },
        },
        {
          x: 3,
          y: 5,
          datasetKey: "0",
          value: 5,
          item: {
            headerStamp,
            receiveTime,
            queriedData: [{ value: 5, path: "/some/topic.something", constantName: undefined }],
          },
          path: "/some/topic.something",
          constantName: undefined,
          startTime: { sec: 0, nsec: 0 },
        },
      ];
      const data = tooltips.map(({ x, y }) => ({ x, y }));

      const newPoints = [
        {
          x: 1,
          y: -1,
        },
        {
          x: 2,
          y: -0.5,
        },
        {
          x: 3,
          y: 6.5,
        },
      ];
      const newTooltips = [
        {
          x: 1,
          y: -1,
          datasetKey: "0",
          value: -1,
          item: {
            receiveTime,
            queriedData: [{ value: -1, path: "/some/topic.something", constantName: undefined }],
          },
          path: "/some/topic.something.@derivative",
          constantName: undefined,
          startTime: { sec: 0, nsec: 0 },
        },
        {
          x: 2,
          y: -0.5,
          datasetKey: "0",
          value: -0.5,
          item: {
            receiveTime,
            queriedData: [{ value: -1.5, path: "/some/topic.something", constantName: undefined }],
          },
          path: "/some/topic.something.@derivative",
          constantName: undefined,
          startTime: { sec: 0, nsec: 0 },
        },
        {
          x: 3,
          y: 6.5,
          datasetKey: "0",
          value: 6.5,
          item: {
            receiveTime,
            queriedData: [{ value: 5, path: "/some/topic.something", constantName: undefined }],
          },
          path: "/some/topic.something.@derivative",
          constantName: undefined,
          startTime: { sec: 0, nsec: 0 },
        },
      ];
      expect(derivative(data, tooltips)).toEqual({ points: newPoints, tooltips: newTooltips });
    });
  });

  // This is a good example of math functions, if this one works then the rest of them should work.
  describe("absoluteValue", () => {
    it("takes the absolute value of tooltips", () => {
      // $FlowFixMe
      const tooltips: TimeBasedChartTooltipData[] = [
        { x: 0, y: NaN, datasetKey: "0" },
        { x: 1, y: -1, datasetKey: "0" },
        { x: 2, y: 1.5, datasetKey: "0" },
        { x: 2, y: "-1.5", datasetKey: "0" },
      ];
      expect(applyToDataOrTooltips(tooltips, mathFunctions.abs)).toEqual([
        { x: 0, y: NaN, datasetKey: "0" },
        { x: 1, y: 1, datasetKey: "0" },
        { x: 2, y: 1.5, datasetKey: "0" },
        { x: 2, y: 1.5, datasetKey: "0" },
      ]);
    });
  });

  it("rad2deg converts radians to degrees", () => {
    const items = [{ x: 1, y: Math.PI }];
    expect(applyToDataOrTooltips(items, mathFunctions.rad2deg)).toEqual([{ x: 1, y: 180 }]);
  });

  it("deg2rad converts degrees to radians", () => {
    const items = [{ x: 1, y: 180 }];
    expect(applyToDataOrTooltips(items, mathFunctions.deg2rad)).toEqual([{ x: 1, y: Math.PI }]);
  });
});
