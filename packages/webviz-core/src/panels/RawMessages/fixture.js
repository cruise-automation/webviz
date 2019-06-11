// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const fixture = {
  topics: [
    { name: "/msgs/big_topic", datatype: "msgs/big_topic" },
    { name: "/foo", datatype: "std_msgs/String" },
    { name: "/baz/num", datatype: "baz/num" },
    { name: "/baz/text", datatype: "baz/text" },
    { name: "/baz/array", datatype: "baz/array" },
    { name: "/geometry/types", datatype: "geometry/types" },
  ],
  frame: {
    "/msgs/big_topic": [
      {
        op: "message",
        datatype: "msgs/big_topic",
        topic: "/msgs/big_topic",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          LotsOfStuff: {
            SomeBoolean: false,
            SomeInteger: 927364.28391,
            count: 0,
            time: { nsec: 627658424, sec: 1526191529 },
            valid: true,
          },
          timestamp_example_1: { sec: 0, nsec: 0 },
          timestamp_example_2: { sec: 1, nsec: 1 },
          timestamp_example_3: { sec: 1500000000, nsec: 1 },
          some_id_example_1: { someId: 123, additional_data: 42 },
          some_id_example_2: { some_id: 123 },
          some_short_data: new Int8Array(6),
          some_long_data: new Uint8ClampedArray(2000),
          some_float_data: new Float64Array(10),
        },
      },
    ],
    "/foo": [
      {
        op: "message",
        datatype: "std_msgs/String",
        topic: "/foo",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          some_id_example_2: { some_id: 123 },
        },
      },
    ],
    "/baz/num": [
      {
        op: "message",
        datatype: "baz/num",
        topic: "/baz/num",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: 3425363211,
      },
    ],
    "/baz/text": [
      {
        op: "message",
        datatype: "baz/text",
        topic: "/baz/text",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: "lidar_side_left/caliper_ogrid_node",
      },
    ],
    "/baz/array": [
      {
        op: "message",
        datatype: "baz/array",
        topic: "/baz/array",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: [false],
      },
    ],
    "/geometry/types": [
      {
        op: "message",
        datatype: "geometry/types",
        topic: "/geometry/types",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          point2d: {
            x: 1.0,
            y: 2.0,
          },
          point3d: {
            x: 1.0,
            y: 2.0,
            z: 3.0,
          },
        },
      },
    ],
  },
};

// separate fixture so that we only need to define datatypes for small subset of types
export const enumFixture = {
  datatypes: {
    "baz/enum": [
      { type: "uint8", name: "ERROR", isConstant: true, value: 0 },
      { type: "uint8", name: "OFF", isConstant: true, value: 1 },
      { type: "uint8", name: "BOOTING", isConstant: true, value: 2 },
      { type: "uint8", name: "ACTIVE", isConstant: true, value: 3 },
      { type: "uint8", name: "value", isArray: false },
    ],
  },
  topics: [{ name: "/baz/enum", datatype: "baz/enum" }],
  frame: {
    "/baz/enum": [
      {
        op: "message",
        datatype: "baz/enum",
        topic: "/baz/enum",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          value: 2,
        },
      },
    ],
  },
};

export const enumAdvancedFixture = {
  datatypes: {
    "baz/enum_advanced": [
      { type: "uint32", name: "OFF", isConstant: true, value: 0 },
      { type: "uint32", name: "ON", isConstant: true, value: 1 },
      { type: "uint32", name: "state", isArray: false },
      { type: "uint32", name: "justField", isArray: false },
      { type: "uint8", name: "RED", isConstant: true, value: 0 },
      { type: "uint8", name: "YELLOW", isConstant: true, value: 1 },
      { type: "uint8", name: "GREEN", isConstant: true, value: 2 },
      { type: "uint8", name: "color", isArray: false },
      { type: "baz/animals", name: "animal__webviz_enum", isArray: false },
      { type: "uint32", name: "animal", isArray: false },
    ],
    "baz/animals": [
      { type: "uint32", name: "CAT", isConstant: true, value: 10000 },
      { type: "uint32", name: "DOG", isConstant: true, value: 10001 },
    ],
  },
  topics: [{ name: "/baz/enum_advanced", datatype: "baz/enum_advanced" }],
  frame: {
    "/baz/enum_advanced": [
      {
        op: "message",
        datatype: "baz/enum_advanced",
        topic: "/baz/enum_advanced",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          state: 1,
          justField: 0,
          color: 2,
          animal__webviz_enum: {},
          animal: 10000,
        },
      },
    ],
  },
};
