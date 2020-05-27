// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import derivative from "./derivative";

describe("derivative", () => {
  it("takes the derivative using the previous message", () => {
    const headerStamp = undefined;
    const receiveTime = { sec: 123, nsec: 456 };
    const data = [
      {
        x: 0,
        y: 0,
        tooltip: {
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
      },
      {
        x: 1,
        y: -1,
        tooltip: {
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
      },
      {
        x: 2,
        y: -1.5,
        tooltip: {
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
      },
      {
        x: 3,
        y: 5,
        tooltip: {
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
      },
    ];
    const tooltips = data.map(({ tooltip }) => tooltip);

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
