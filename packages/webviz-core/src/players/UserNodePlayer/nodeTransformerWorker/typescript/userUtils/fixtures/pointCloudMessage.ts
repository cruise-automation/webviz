import { sensor_msgs__PointCloud2 } from "../pointClouds";

export const POINT_CLOUD_MESSAGE: sensor_msgs__PointCloud2 = {
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
      name: "rgb",
      offset: 16,
      datatype: 7,
      count: 1,
    },
  ],
  header: {
    frame_id: "root_frame_id",
    stamp: {
      sec: 10,
      nsec: 10,
    },
    seq: 0,
  },
  height: 1,
  is_bigendian: false,
  is_dense: true,
  point_step: 32,
  row_step: 32,
  width: 1,
  data: new Uint8Array([
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
  ]),
};

export const POINT_CLOUD_WITH_ADDITIONAL_FIELDS: sensor_msgs__PointCloud2 = {
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
    {
      name: "foo16_some_really_really_long_name",
      offset: 19,
      datatype: 3,
      count: 1,
    },
  ],
  header: {
    frame_id: "root_frame_id",
    stamp: {
      sec: 10,
      nsec: 10,
    },
    seq: 0,
  },
  height: 1,
  is_bigendian: false,
  is_dense: true,
  point_step: 21,
  row_step: 21,
  width: 2,
  data: new Uint8Array([
    0, //   1, start of point 1
    0, //   2
    0, //   3
    0, //   4, x: float32 = 0
    0, //   5
    0, //   6
    128, // 7
    63, //  8, y: float32 = 1
    0, //   9
    0, //   10
    0, //   11
    64, //  12, z: float32 =  2
    7, //   13, foo: uint8 = 7
    6, //   14
    0, //   15, bar: uint16 = 6
    5, //   16
    0, //   17
    0, //   18
    0, //   19, baz: int32 = 5
    9, //   20
    1, //   21, foo16: int16 = 265
    // ---------- another row
    0, //   22, start of point 2
    0, //   23
    0, //   24
    0, //   25 x: float32 = 0
    0, //   26
    0, //   27
    128, // 28
    63, //  29 y: float32 = 1
    0, //   30
    0, //   31
    0, //   32
    64, //  33, z: float32 =  2
    9, //   34, foo: uint8 = 9
    8, //   35
    0, //   36, bar: uint16 = 8
    7, //   37
    0, //   38
    0, //   39
    0, //   40, baz: int32 = 7
    2, //   41
    0, //   42, foo16: int16 = 2
  ]),
};
