// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { decodeMarker } from "./decodeMarker";
import { POINT_CLOUD_MESSAGE } from "./fixture/pointCloudData";

describe("<PointClouds />", () => {
  describe("hitmap", () => {
    it("builds empty color buffer if hitmap colors are provided", () => {
      const result = decodeMarker({
        ...POINT_CLOUD_MESSAGE,
        // Three colors per point
        hitmapColors: [255, 255, 255, 255, 255, 255, 255, 255, 255],
      });
      const { colorBuffer } = result;
      expect(colorBuffer).toBeNull();
    });
  });
});
