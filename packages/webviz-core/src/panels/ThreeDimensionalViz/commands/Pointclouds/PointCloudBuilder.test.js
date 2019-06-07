// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mapMarker } from "./PointCloudBuilder";

const fields = [
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
    name: "rgb",
    offset: 16,
    datatype: 7,
    count: 1,
  },
];

const msg = {
  fields,
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
  point_step: 32,
  row_step: 32,
  width: 2,
  data: [
    // point 1
    125,
    236,
    11,
    197,
    118,
    102,
    48,
    196,
    50,
    194,
    23,
    192,
    0,
    0,
    128,
    63,
    255,
    225,
    127,
    0,
    254,
    127,
    0,
    0,
    16,
    142,
    140,
    0,
    161,
    254,
    127,
    0,
    // point 2
    125,
    236,
    11,
    197,
    118,
    102,
    48,
    196,
    50,
    194,
    23,
    192,
    0,
    0,
    128,
    63,
    255,
    255,
    127,
    0,
    254,
    127,
    0,
    0,
    16,
    142,
    140,
    0,
    161,
    254,
    127,
    0,
    // point 3
    118,
    102,
    48,
    196,
    125,
    236,
    11,
    197,
    50,
    194,
    23,
    192,
    0,
    0,
    128,
    63,
    127,
    255,
    127,
    0,
    254,
    127,
    0,
    0,
    16,
    142,
    140,
    0,
    161,
    254,
    127,
    8,
  ],
};

describe("PointCloudBuilder", () => {
  it("builds point cloud out of simple PointCloud2", () => {
    const result = mapMarker(msg);
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
    const result = mapMarker({ ...msg, colorField: "rgb" });
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
      ...msg,
      colorField: "x",
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

  it("builds a point cloud with height 3", () => {
    const result = mapMarker({
      ...msg,
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

    it("reads uint8", () => {
      const result = mapMarker({ ...marker, colorField: "foo" });
      // because we only have 2 values, the colors should be min/max of rainbow spectrum
      expect(result.colors).toEqual(new Uint8Array([255, 0, 0, 255, 0, 255]));
    });

    it("reads uint16", () => {
      const result = mapMarker({ ...marker, colorField: "bar" });
      // because we only have 2 values, the colors should be min/max of rainbow spectrum
      expect(result.colors).toEqual(new Uint8Array([255, 0, 0, 255, 0, 255]));
    });

    it("reads int32", () => {
      const result = mapMarker({ ...marker, colorField: "baz" });
      // because we only have 2 values, the colors should be min/max of rainbow spectrum
      expect(result.colors).toEqual(new Uint8Array([255, 0, 0, 255, 0, 255]));
    });
  });
});
