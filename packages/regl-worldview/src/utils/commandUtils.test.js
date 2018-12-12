//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { shouldConvert } from "./commandUtils";

describe("command utils", () => {
  describe("shouldConvert", () => {
    const pointObj = { x: -1, y: 0, z: 0 };
    const pointArr = [-1, 23, 5];
    it("point objects/color objects, e.g. { x:0, y:0, z:0 }, should be converted", () => {
      expect(shouldConvert(pointObj)).toBe(true);
    });
    it("nested objects, e.g. [{ x:0, y:0, z:0}, { x:0, y:0, z:0}], should be converted", () => {
      expect(shouldConvert([pointObj, pointObj])).toBe(true);
    });
    it("number arrays, e.g. [0,0,1], should not be converted", () => {
      expect(shouldConvert(pointArr)).toBe(false);
    });
    it("nested arrays, e.g. [[0,0,1], [0, 0, 1]], should not be converted", () => {
      expect(shouldConvert([pointArr, pointArr])).toBe(false);
    });
    it("should not try to convert when passed falsey values", () => {
      expect(shouldConvert(undefined)).toBe(false);
      expect(shouldConvert(null)).toBe(false);
    });
  });
});
