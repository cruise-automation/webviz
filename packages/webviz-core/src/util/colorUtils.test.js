// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { rgbStrToReglRGB, hexToRgbString } from "webviz-core/src/util/colorUtils";

describe("colorUtils", () => {
  it("hexToRgbString", () => {
    expect(hexToRgbString("#ffffff", 0.5)).toEqual("rgba(255, 255, 255, 0.5)");
  });
  it("rgbStrToReglRGB", () => {
    expect(rgbStrToReglRGB("rgb(255,255,255)")).toEqual([1, 1, 1, 1]);
    expect(rgbStrToReglRGB("rgb(255,0,255)", 0)).toEqual([1, 0, 1, 0]);
    expect(rgbStrToReglRGB("rgba(0,255,0, 0.5)")).toEqual([0, 1, 0, 0.5]);
  });
});
