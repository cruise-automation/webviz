//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { rotateHue, rgbToHsl, hslToRgb, interpolateColormap, GRAY_COLORMAP, COLORS } from "./colors";

describe("colors", () => {
  describe("rotateHue", () => {
    it("rotates colors", () => {
      // Rotating 0.5 (half way around the unit circle) turns red into teal
      expect(rotateHue({ r: 1, g: 0, b: 0, a: 1 }, 0.5)).toEqual(
        expect.objectContaining({ r: 0, g: 0.9999999999999998, b: 1, a: 1 })
      );

      // Rotating 0.5 (half way around the unit circle) turns orange into blue
      expect(rotateHue({ r: 1, g: 1, b: 0, a: 1 }, 0.5)).toEqual(
        expect.objectContaining({ r: 0, g: 6.661338147750939e-16, b: 1, a: 1 })
      );
    });
  });

  describe("rgbToHsl", () => {
    it("returns hsl colors", () => {
      // Pure red is 0 "hue" in HSL
      expect(rgbToHsl({ r: 1, g: 0, b: 0, a: 1 })).toEqual({ h: 0, s: 1, l: 0.5 });
    });
  });

  describe("hslToRgb", () => {
    it("returns rgb colors", () => {
      // 0 hue is pure red in RGB
      expect(hslToRgb({ h: 0, s: 1, l: 0.5 })).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });
  });

  describe("colormap", () => {
    it("interpolates gray", () => {
      expect(interpolateColormap(GRAY_COLORMAP, 1.0)).toEqual(COLORS.LIGHT);
      const gray = interpolateColormap(GRAY_COLORMAP, 0.5);
      expect(gray.r).toBeLessThanOrEqual(COLORS.GRAY.r);
      expect(gray.g).toBeLessThanOrEqual(COLORS.GRAY.g);
      expect(gray.b).toBeLessThanOrEqual(COLORS.GRAY.b);
      expect(gray.a).toEqual(1.0);
    });
  });
});
