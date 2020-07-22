// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
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
    { name: "/baz/array/obj", datatype: "baz/array/obj" },
    { name: "/geometry/types", datatype: "geometry/types" },
  ],
  frame: {
    "/msgs/big_topic": [
      {
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
        topic: "/foo",
        receiveTime: { sec: 122, nsec: 456789011 },
        message: { some_array: ["a", "b", "c"], some_deleted_key: "GONE", some_id_example_2: { some_id: 0 } },
      },
      {
        topic: "/foo",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: { some_array: ["a", "b", "c", "d", "e", "f"], some_id_example_2: { some_id: 123 } },
      },
    ],
    "/baz/num": [
      {
        topic: "/baz/num",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: 3425363211,
      },
    ],
    "/baz/text": [
      {
        topic: "/baz/text",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: "lidar_side_left/caliper_ogrid_node",
      },
    ],
    "/baz/array": [
      {
        topic: "/baz/array",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: [false],
      },
    ],
    "/baz/array/obj": [
      {
        topic: "/baz/array/obj",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: [{ a: "b", c: "d", e: "f" }],
      },
    ],
    "/geometry/types": [
      {
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
    "baz/enum": {
      fields: [
        { type: "uint8", name: "ERROR", isConstant: true, value: 0 },
        { type: "uint8", name: "OFF", isConstant: true, value: 1 },
        { type: "uint8", name: "BOOTING", isConstant: true, value: 2 },
        { type: "uint8", name: "ACTIVE", isConstant: true, value: 3 },
        { type: "uint8", name: "value", isArray: false },
      ],
    },
  },
  topics: [{ name: "/baz/enum", datatype: "baz/enum" }],
  frame: {
    "/baz/enum": [
      {
        topic: "/baz/enum",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          value: 2,
        },
      },
    ],
  },
};

const exampleMessage = {
  state: 1,
  justField: 0,
  color: 2,
  animal__webviz_enum: {},
  animal: 10000,
  sentence: 'String with "quotes" and /slashes/.',
};

export const enumAdvancedFixture = {
  datatypes: {
    "baz/enum_advanced": {
      fields: [
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
    },
    "baz/animals": {
      fields: [
        { type: "uint32", name: "CAT", isConstant: true, value: 10000 },
        { type: "uint32", name: "DOG", isConstant: true, value: 10001 },
      ],
    },
  },
  topics: [{ name: "/baz/enum_advanced", datatype: "baz/enum_advanced" }],
  frame: {
    "/baz/enum_advanced": [
      {
        topic: "/baz/enum_advanced",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: exampleMessage,
      },
    ],
  },
};

export const withMissingData = {
  datatypes: {
    "baz/missing_data": {
      fields: [{ type: "uint8", name: "value", isArray: false }],
    },
  },
  topics: [{ name: "/baz/missing_data", datatype: "baz/missing_data" }],
  frame: {
    "/baz/missing_data": [
      {
        topic: "/baz/missing_data",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          value: null,
        },
      },
    ],
  },
};

export const withLongString = {
  topics: [{ name: "/baz/text", datatype: "baz/text" }],
  frame: {
    "/baz/text": [
      {
        topic: "/baz/text",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          text: new Array(10).fill("string").join(" "),
          long_text: new Array(1024).fill("string").join(" "),
        },
      },
    ],
  },
};

export const topicsToDiffFixture = {
  datatypes: enumAdvancedFixture.datatypes,
  topics: [
    { name: "/baz/enum_advanced", datatype: "baz/enum_advanced" },
    { name: "/another/baz/enum_advanced", datatype: "baz/enum_advanced" },
  ],
  frame: {
    "/baz/enum_advanced": [
      {
        topic: "/baz/enum_advanced",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: { ...exampleMessage, toBeDeletedVal: "Bye!", toBeDeletedObj: { a: 1, b: 2, c: 3 } },
      },
    ],
    "/another/baz/enum_advanced": [
      {
        ...enumAdvancedFixture.frame["/baz/enum_advanced"][0],
        topic: "/another/baz/enum_advanced",
        message: {
          ...exampleMessage,
          state: 2,
          color: 3,
          newField: "hello",
          sentence: 'A different string with "quotes" and /slashes/.',
        },
      },
    ],
  },
};

export const topicsWithIdsToDiffFixture = {
  datatypes: enumAdvancedFixture.datatypes,
  topics: [
    { name: "/baz/enum_advanced", datatype: "baz/enum_advanced" },
    { name: "/another/baz/enum_advanced", datatype: "baz/enum_advanced" },
  ],
  frame: {
    "/baz/enum_advanced": [
      {
        ...enumAdvancedFixture.frame["/baz/enum_advanced"][0],
        message: [
          { ...exampleMessage, toBeDeletedVal: "Bye!", toBeDeletedObj: { a: 1, b: 2, c: 3 }, id: 1 },
          { ...exampleMessage, id: 2 },
        ],
      },
    ],
    "/another/baz/enum_advanced": [
      {
        ...enumAdvancedFixture.frame["/baz/enum_advanced"][0],
        topic: "/another/baz/enum_advanced",
        message: [
          { ...exampleMessage, state: 5, id: 2 },
          { ...exampleMessage, state: 2, color: 3, newField: "hello", id: 1 },
        ],
      },
    ],
  },
};

export const multipleNumberMessagesFixture = {
  datatypes: { multiple_number_messages: { fields: [{ type: "uint32", name: "value", isArray: false }] } },
  topics: [{ name: "/multiple_number_messages", datatype: "multiple_number_messages" }],
  frame: {
    "/baz/enum": [
      {
        topic: "/multiple_number_messages",
        receiveTime: { sec: 123, nsec: 1 },
        message: { value: 1 },
      },
      {
        topic: "/multiple_number_messages",
        receiveTime: { sec: 123, nsec: 2 },
        message: { value: 2 },
      },
      {
        topic: "/multiple_number_messages",
        receiveTime: { sec: 123, nsec: 3 },
        message: { value: 3 },
      },
    ],
  },
};
