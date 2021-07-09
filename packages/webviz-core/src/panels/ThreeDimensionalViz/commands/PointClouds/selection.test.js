// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { MouseEventObject } from "regl-worldview";

import { decodeMarker } from "./decodeMarker";
import { POINT_CLOUD_MESSAGE, POINT_CLOUD_WITH_ADDITIONAL_FIELDS } from "./fixture/pointCloudData";
import { getClickedPointColor, decodeData } from "./selection";

describe("<PointClouds />", () => {
  // $FlowFixMe - Flow doesn't like that we're overwriting this.
  console.info = () => {
    // decodeMarker() will log warnings in console whenever a buffer cannot be sent to GPU
  };

  describe("getClickedPointColor", () => {
    it("returns undefined when points field is empty", () => {
      const decodedMarker = ((decodeMarker(POINT_CLOUD_WITH_ADDITIONAL_FIELDS): any): MouseEventObject);
      decodedMarker.positionBuffer = [];
      expect(getClickedPointColor(decodedMarker, 1000)).toBe(undefined);
    });

    it("returns undefined when instanceIndex does not match any point", () => {
      const decodedMarker = ((decodeMarker(POINT_CLOUD_WITH_ADDITIONAL_FIELDS): any): MouseEventObject);
      expect(getClickedPointColor(decodedMarker, null)).toBe(undefined);
      expect(getClickedPointColor(decodedMarker, 1000)).toBe(undefined);
    });

    it("returns selected point positions and colors", () => {
      const marker = decodeMarker(POINT_CLOUD_MESSAGE);
      const color = getClickedPointColor(marker, 1);
      expect((color || []).map((v) => Math.floor(v))).toStrictEqual([127, 255, 255, 1]);
    });

    it("returns selected point positions and colors when instanceIndex is zero", () => {
      const marker = decodeMarker(POINT_CLOUD_MESSAGE);
      const color = getClickedPointColor(marker, 0);
      expect((color || []).map((v) => Math.floor(v))).toStrictEqual([127, 225, 255, 1]);
    });

    it("handles endianness", () => {
      const marker = decodeMarker({
        ...POINT_CLOUD_MESSAGE,
        settings: { colorMode: { mode: "rgb" } },
        is_bigendian: true,
      });
      const color = getClickedPointColor(marker, 1);
      expect((color || []).map((v) => Math.floor(v))).toStrictEqual([255, 255, 127, 1]);
    });

    it("handles rainbow colors", () => {
      const input = {
        ...POINT_CLOUD_MESSAGE,
        settings: { colorMode: { mode: "rainbow", colorField: "y" } },
      };
      const marker = decodeMarker(input);
      const color = getClickedPointColor(marker, 1);
      expect((color || []).map((v) => Math.floor(v))).toStrictEqual([255, 0, 255, 1]);
    });

    it("handles gradient colors", () => {
      const input = {
        ...POINT_CLOUD_WITH_ADDITIONAL_FIELDS,
        settings: {
          colorMode: {
            mode: "gradient",
            minColor: { r: 1, g: 0, b: 0, a: 1 },
            maxColor: { r: 0, g: 0, b: 1, a: 1 },
            colorField: "foo",
          },
        },
      };
      const marker = decodeMarker(input);
      const color = getClickedPointColor(marker, 1);
      expect((color ?? []).map((v) => Math.floor(v))).toStrictEqual([0, 0, 255, 1]);
    });

    it("handles additional fields", () => {
      const input = {
        ...POINT_CLOUD_WITH_ADDITIONAL_FIELDS,
        settings: { colorMode: { mode: "rainbow", colorField: "bar" } },
      };
      const marker = decodeMarker(input);
      const pointColor = getClickedPointColor(marker, 1);
      expect(pointColor).not.toBeNull();
      expect((pointColor || []).map((v) => Math.floor(v))).toStrictEqual([255, 0, 255, 1]);
      const data = decodeData(marker);
      expect(data[1]).toEqual({ x: 0, y: 1, z: 2, bar: 8, baz: 7, foo: 9, foo16_some_really_really_long_name: 2 });
    });
  });

  describe("decodeData", () => {
    it("decodes additional fields", () => {
      expect(decodeData(POINT_CLOUD_WITH_ADDITIONAL_FIELDS)).toEqual([
        { bar: 6, baz: 5, foo: 7, foo16_some_really_really_long_name: 265, x: 0, y: 1, z: 2 },
        { bar: 8, baz: 7, foo: 9, foo16_some_really_really_long_name: 2, x: 0, y: 1, z: 2 },
      ]);
    });
  });
});
