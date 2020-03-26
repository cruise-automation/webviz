// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mapMarker, memoizedMapMarker, decodeAdditionalFields, getClickedInfo } from "./PointCloudBuilder";
import {
  POINT_CLOUD_MESSAGE,
  POINT_CLOUD_WITH_ADDITIONAL_FIELDS,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands/Pointclouds/fixture/pointCloudData";
import type { PointCloud2 } from "webviz-core/src/types/Messages";

describe("PointCloudBuilder", () => {
  it("builds point cloud out of simple PointCloud2", () => {
    const result = mapMarker(POINT_CLOUD_MESSAGE);
    const pos = result.points;
    const colorCodes = result.colors;
    expect(pos).toHaveLength(6);
    expect(Math.floor(pos[0])).toBe(-2239);
    expect(Math.floor(pos[1])).toBe(-706);
    expect(Math.floor(pos[2])).toBe(-3);
    expect(Math.floor(pos[3])).toBe(-2239);
    expect(Math.floor(pos[4])).toBe(-706);
    expect(Math.floor(pos[5])).toBe(-3);
    expect(colorCodes[0]).toBe(255);
    expect(colorCodes[1]).toBe(225);
    expect(colorCodes[2]).toBe(127);
    expect(colorCodes[3]).toBe(255);
    expect(colorCodes[4]).toBe(255);
    expect(colorCodes[5]).toBe(127);
  });

  it("uses rgb values when rendering by rgb colorfield", () => {
    const result = mapMarker({
      ...POINT_CLOUD_MESSAGE,
      settings: { colorMode: { mode: "rgb" } },
    });
    const pos = result.points;
    const colorCodes = result.colors;
    expect(pos).toHaveLength(6);
    expect(Math.floor(pos[0])).toBe(-2239);
    expect(Math.floor(pos[1])).toBe(-706);
    expect(Math.floor(pos[2])).toBe(-3);
    expect(Math.floor(pos[3])).toBe(-2239);
    expect(Math.floor(pos[4])).toBe(-706);
    expect(Math.floor(pos[5])).toBe(-3);
    expect(colorCodes[0]).toBe(255);
    expect(colorCodes[1]).toBe(225);
    expect(colorCodes[2]).toBe(127);
    expect(colorCodes[3]).toBe(255);
    expect(colorCodes[4]).toBe(255);
    expect(colorCodes[5]).toBe(127);
  });

  it("builds point cloud with custom colors", () => {
    const input = {
      ...POINT_CLOUD_MESSAGE,
      settings: { colorMode: { mode: "rainbow", colorField: "x" } },
    };
    const result = mapMarker(input);
    const pos = result.points;
    const colorCodes = result.colors;
    expect(pos).toHaveLength(6);
    expect(Math.floor(pos[0])).toBe(-2239);
    expect(Math.floor(pos[1])).toBe(-706);
    expect(Math.floor(pos[2])).toBe(-3);
    expect(Math.floor(pos[3])).toBe(-2239);
    expect(Math.floor(pos[4])).toBe(-706);
    expect(Math.floor(pos[5])).toBe(-3);
    expect(colorCodes[0]).toBe(255);
    expect(colorCodes[1]).toBe(0);
    expect(colorCodes[2]).toBe(0);
    expect(colorCodes[3]).toBe(255);
    expect(colorCodes[4]).toBe(0);
    expect(colorCodes[5]).toBe(0);
  });

  it("builds point cloud with custom flat color", () => {
    const input = {
      ...POINT_CLOUD_MESSAGE,
      settings: { colorMode: { mode: "flat", flatColor: "#123456" } },
    };
    const result = mapMarker(input);
    const pos = result.points;
    const colorCodes = result.colors;
    expect(pos).toHaveLength(6);
    expect(Math.floor(pos[0])).toBe(-2239);
    expect(Math.floor(pos[1])).toBe(-706);
    expect(Math.floor(pos[2])).toBe(-3);
    expect(Math.floor(pos[3])).toBe(-2239);
    expect(Math.floor(pos[4])).toBe(-706);
    expect(Math.floor(pos[5])).toBe(-3);
    expect(colorCodes[0]).toBe(0x12);
    expect(colorCodes[1]).toBe(0x34);
    expect(colorCodes[2]).toBe(0x56);
    expect(colorCodes[3]).toBe(0x12);
    expect(colorCodes[4]).toBe(0x34);
    expect(colorCodes[5]).toBe(0x56);
  });

  it("builds a point cloud with height 3", () => {
    const result = mapMarker({
      ...POINT_CLOUD_MESSAGE,
      height: 3,
      width: 1,
      row_step: 32,
    });
    const pos = result.points;
    expect(pos).toHaveLength(9);
    expect(Math.floor(pos[0])).toBe(-2239);
    expect(Math.floor(pos[1])).toBe(-706);
    expect(Math.floor(pos[2])).toBe(-3);
    expect(Math.floor(pos[3])).toBe(-2239);
    expect(Math.floor(pos[4])).toBe(-706);
    expect(Math.floor(pos[5])).toBe(-3);
    expect(Math.floor(pos[6])).toBe(-706);
    expect(Math.floor(pos[7])).toBe(-2239);
    expect(Math.floor(pos[8])).toBe(-3);

    const colorCodes = result.colors;
    expect(colorCodes[0]).toBe(255);
    expect(colorCodes[1]).toBe(225);
    expect(colorCodes[2]).toBe(127);
    expect(colorCodes[3]).toBe(255);
    expect(colorCodes[4]).toBe(255);
    expect(colorCodes[5]).toBe(127);
    expect(colorCodes[6]).toBe(127);
    expect(colorCodes[7]).toBe(255);
    expect(colorCodes[8]).toBe(127);
  });

  const vel = {
    fields: [
      {
        name: "x",
        offset: 0,
        datatype: 7,
        count: 1,
      },
      {
        name: "y",
        offset: 4,
        datatype: 7,
        count: 1,
      },
      {
        name: "z",
        offset: 8,
        datatype: 7,
        count: 1,
      },
      {
        name: "intensity",
        offset: 16,
        datatype: 2,
        count: 1,
      },
    ],
    type: 102,
    header: {
      frame_id: "root_frame_id",
      stamp: {
        sec: 10,
        nsec: 10,
      },
    },
    pose: {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 0 },
    },
    name: "foo",
    data: [
      // point 1
      0,
      0,
      192,
      127,
      0,
      0,
      192,
      127,
      0,
      0,
      192,
      127,
      0,
      0,
      192,
      127,
      255,
      255,
      255,
      255,
    ],
    height: 1,
    is_bigendian: 0,
    is_dense: 0,
    point_step: 20,
    row_step: 20,
    width: 1,
  };

  it("builts point cloud based on lidar_organized containing nan values", () => {
    const result = mapMarker(vel);
    expect(result.points).toHaveLength(0);
  });

  describe("color field data type reading", () => {
    const marker = {
      fields: [
        {
          name: "x",
          offset: 0,
          datatype: 7,
          count: 1,
        },
        {
          name: "y",
          offset: 4,
          datatype: 7,
          count: 1,
        },
        {
          name: "z",
          offset: 8,
          datatype: 7,
          count: 1,
        },
        {
          name: "foo",
          offset: 12,
          datatype: 2,
          count: 1,
        },
        {
          name: "bar",
          offset: 13,
          datatype: 4,
          count: 1,
        },
        {
          name: "baz",
          offset: 15,
          datatype: 5,
          count: 1,
        },
      ],
      type: 102,
      name: "foo",
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 0 },
      },
      header: {
        frame_id: "root_frame_id",
        stamp: {
          sec: 10,
          nsec: 10,
        },
      },
      height: 1,
      is_bigendian: 0,
      is_dense: 1,
      point_step: 19,
      row_step: 19,
      width: 2,
      data: [
        0, // start of point 1
        0,
        0,
        0, // x: float32 = 0
        0,
        0,
        128,
        63, // y: float32 = 1
        0,
        0,
        0,
        64, // z: float32 =  2
        7, // foo: uint8 = 7
        6,
        0, // bar: uint16 = 6
        5,
        0,
        0,
        0, // baz: int32 = 5
        0, // start of point 2
        0,
        0,
        0, // x: float32 = 0
        0,
        0,
        128,
        63, // y: float32 = 1
        0,
        0,
        0,
        64, // z: float32 =  2
        9, // foo: uint8 = 9
        8,
        0, // bar: uint16 = 8
        7,
        0,
        0,
        0, // baz: int32 = 7
      ],
    };

    it("reads uint8 rainbow with min/max value", () => {
      // because we only have 2 values, the colors should be min/max
      expect(
        mapMarker({
          ...marker,
          settings: {
            colorMode: {
              mode: "rainbow",
              colorField: "foo",
            },
          },
        }).colors
      ).toEqual(new Uint8Array([255, 0, 0, 255, 0, 255]));

      // point 1 is halfway between minValue=5 and point 2, so color should be halfway in between
      expect(
        mapMarker({
          ...marker,
          settings: {
            colorMode: {
              mode: "rainbow",
              colorField: "foo",
              minValue: 5,
            },
          },
        }).colors
      ).toEqual(new Uint8Array([0, 255, 127, 255, 0, 255]));

      // point 2 is halfway between point 1 and maxValue=11, so color should be halfway in between
      expect(
        mapMarker({
          ...marker,
          settings: {
            colorMode: {
              mode: "rainbow",
              colorField: "foo",
              maxValue: 11,
            },
          },
        }).colors
      ).toEqual(new Uint8Array([255, 0, 0, 0, 255, 127]));
    });

    it("reads uint8 custom gradient with min/max value", () => {
      // because we only have 2 values, the colors should be min/max
      expect(
        mapMarker({
          ...marker,
          settings: {
            colorMode: {
              mode: "gradient",
              colorField: "foo",
              minColor: "#ff7700",
              maxColor: "#0000ff",
            },
          },
        }).colors
      ).toEqual(new Uint8Array([0xff, 0x77, 0, 0, 0, 0xff]));

      // point 1 is halfway between minValue=5 and point 2, so color should be halfway in between
      expect(
        mapMarker({
          ...marker,
          settings: {
            colorMode: {
              mode: "gradient",
              colorField: "foo",
              minValue: 5,
              minColor: "#ff7700",
              maxColor: "#0000ff",
            },
          },
        }).colors
      ).toEqual(new Uint8Array([0x7f, 0x3b, 0x7f, 0, 0, 0xff]));

      // point 2 is halfway between point 1 and maxValue=11, so color should be halfway in between
      expect(
        mapMarker({
          ...marker,
          settings: {
            colorMode: {
              mode: "gradient",
              colorField: "foo",
              maxValue: 11,
              minColor: "#ff7700",
              maxColor: "#0000ff",
            },
          },
        }).colors
      ).toEqual(new Uint8Array([0xff, 0x77, 0, 0x7f, 0x3b, 0x7f]));
    });

    it("reads uint16", () => {
      const result = mapMarker({ ...marker, settings: { colorMode: { mode: "rainbow", colorField: "bar" } } });
      // because we only have 2 values, the colors should be min/max of rainbow spectrum
      expect(result.colors).toEqual(new Uint8Array([255, 0, 0, 255, 0, 255]));
    });

    it("reads int32", () => {
      const result = mapMarker({ ...marker, settings: { colorMode: { mode: "rainbow", colorField: "baz" } } });
      // because we only have 2 values, the colors should be min/max of rainbow spectrum
      expect(result.colors).toEqual(new Uint8Array([255, 0, 0, 255, 0, 255]));
    });
  });

  describe("decodeAdditionalFields", () => {
    it("decodes additional fields", () => {
      const fullyDecodedMarker = decodeAdditionalFields(POINT_CLOUD_WITH_ADDITIONAL_FIELDS);
      expect(fullyDecodedMarker.bar).toEqual([6, 8]);
      expect(fullyDecodedMarker.baz).toEqual([5, 7]);
      expect(fullyDecodedMarker.foo).toEqual([7, 9]);
      expect(fullyDecodedMarker.foo16_some_really_really_long_name).toEqual([265, 2]);
    });
  });

  describe("getClickedInfo", () => {
    it("returns undefined when points field is empty", () => {
      const partiallyDecodedMarker = ((mapMarker(POINT_CLOUD_WITH_ADDITIONAL_FIELDS): any): PointCloud2);
      const fullyDecodedMarker = decodeAdditionalFields(partiallyDecodedMarker);
      fullyDecodedMarker.points = [];
      expect(getClickedInfo(fullyDecodedMarker, 1000)).toEqual(undefined);
    });

    it("returns undefined when instanceIndex does not match any point", () => {
      const partiallyDecodedMarker = ((mapMarker(POINT_CLOUD_WITH_ADDITIONAL_FIELDS): any): PointCloud2);
      const fullyDecodedMarker = decodeAdditionalFields(partiallyDecodedMarker);
      expect(getClickedInfo(fullyDecodedMarker, null)).toEqual(undefined);
      expect(getClickedInfo(fullyDecodedMarker, 1000)).toEqual(undefined);
    });

    it("returns the clicked point and color", () => {
      const partiallyDecodedMarker = ((mapMarker(POINT_CLOUD_MESSAGE): any): PointCloud2);
      const fullyDecodedMarker = decodeAdditionalFields(partiallyDecodedMarker);
      expect(getClickedInfo(fullyDecodedMarker, 0)).toEqual({
        clickedPoint: [-2238.780517578125, -705.6009521484375, -2.371227741241455],
        clickedPointColor: [255, 225, 127, 1],
      });
    });

    it("returns the clicked point, color and additional field values", () => {
      const partiallyDecodedMarker = ((mapMarker(POINT_CLOUD_WITH_ADDITIONAL_FIELDS): any): PointCloud2);
      const fullyDecodedMarker = decodeAdditionalFields(partiallyDecodedMarker);
      expect(getClickedInfo(fullyDecodedMarker, 0)).toEqual({
        additionalFieldValues: { bar: 6, baz: 5, foo: 7, foo16_some_really_really_long_name: 265 },
        clickedPoint: [0, 1, 2],
        clickedPointColor: [255, 255, 255, 1],
      });
      expect(getClickedInfo(fullyDecodedMarker, 1)).toEqual({
        additionalFieldValues: { bar: 8, baz: 7, foo: 9, foo16_some_really_really_long_name: 2 },
        clickedPoint: [0, 1, 2],
        clickedPointColor: [255, 255, 255, 1],
      });
    });
  });

  describe("memoizedMapMarker", () => {
    it("returns the cached result for the same marker message without settings", () => {
      const result1 = mapMarker({ ...POINT_CLOUD_MESSAGE });
      const result2 = mapMarker({ ...POINT_CLOUD_MESSAGE });
      const result3 = memoizedMapMarker({ ...POINT_CLOUD_MESSAGE });
      const result4 = memoizedMapMarker({ ...POINT_CLOUD_MESSAGE });
      expect(result1).not.toBe(result2);
      expect(result3).toBe(result4);
    });

    it("caches results based on equality check on 'data' field", () => {
      const result1 = memoizedMapMarker({ ...POINT_CLOUD_MESSAGE, data: [1] });
      const result2 = memoizedMapMarker({ ...POINT_CLOUD_MESSAGE, data: [1] });
      expect(result1).not.toBe(result2);
      const data = [1];
      const result3 = memoizedMapMarker({ ...POINT_CLOUD_MESSAGE, data });
      const result4 = memoizedMapMarker({ ...POINT_CLOUD_MESSAGE, data });
      expect(result3).toBe(result4);
    });
    it("caches results based on deep-equality check on 'settings' field", () => {
      const result1 = memoizedMapMarker({ ...POINT_CLOUD_MESSAGE, settings: { colorField: "foo" } });
      const result2 = memoizedMapMarker({ ...POINT_CLOUD_MESSAGE, settings: { colorField: "foo" } });
      expect(result1).toBe(result2);
    });
  });
});
