// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { FLOAT_SIZE, reinterpretBufferToFloat, expandBufferToFloat } from "./buffers";
import { POINT_CLOUD_MESSAGE } from "./fixture/pointCloudData";

describe("<PointClouds />", () => {
  describe("data transformations", () => {
    it("reinterprets data buffer as a float array", () => {
      const { data } = POINT_CLOUD_MESSAGE;
      const buffer = reinterpretBufferToFloat(data);
      expect(buffer.length).toBe(6 * FLOAT_SIZE);
      expect(Math.floor(buffer[0])).toBe(-2239);
      expect(Math.floor(buffer[1])).toBe(-706);
      expect(Math.floor(buffer[2])).toBe(-3);
      expect(Math.floor(buffer[8])).toBe(-2239);
      expect(Math.floor(buffer[9])).toBe(-706);
      expect(Math.floor(buffer[10])).toBe(-3);
    });

    it("expands data buffer to make it float array", () => {
      const { data } = POINT_CLOUD_MESSAGE;
      const buffer = expandBufferToFloat(data);
      expect(buffer.length).toBe(data.length);
      expect(Math.floor(buffer[16])).toBe(255);
      expect(Math.floor(buffer[17])).toBe(225);
      expect(Math.floor(buffer[18])).toBe(127);
    });
  });
});
