// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { buildMarkerData } from "./index";

describe("buildMarkerData", () => {
  const cameraInfo = {
    width: 10,
    height: 5,
    binning_x: 0,
    binning_y: 0,
    roi: {
      x_offset: 0,
      y_offset: 0,
      height: 0,
      width: 0,
      do_rectify: false,
    },
    distortion_model: ("": any),
    D: [],
    K: [],
    P: [],
    R: [],
  };

  const marker = {
    topic: "foo",
    datatype: "bar",
    op: "message",
    receiveTime: { sec: 0, nsec: 0 },
    message: {},
  };

  it("returns nothing if markers are empty", () => {
    expect(buildMarkerData([], 1, true, cameraInfo)).toEqual({
      markers: [],
      originalHeight: undefined,
      originalWidth: undefined,
      cameraModel: null,
    });
  });

  it("requires cameraInfo if transformMarkers is true", () => {
    expect(buildMarkerData([marker], 1, false, null)).toEqual({
      markers: [marker],
      cameraModel: undefined,
      originalWidth: undefined,
      originalHeight: undefined,
    });
    expect(buildMarkerData([marker], 1, true, null)).toEqual(null);
  });

  it("requires either cameraInfo or scale==1", () => {
    expect(buildMarkerData([marker], 1, false, cameraInfo)).toEqual({
      markers: [marker],
      cameraModel: undefined,
      originalWidth: 10,
      originalHeight: 5,
    });
    expect(buildMarkerData([marker], 0.5, false, null)).toEqual(null);
  });
});
