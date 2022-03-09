// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";

export const fixture = {
  topics: [
    { name: "/msgs/big_topic", datatypeName: "msgs/big_topic", datatypeId: "msgs/big_topic" },
    { name: "/foo", datatypeName: "std_msgs/String", datatypeId: "std_msgs/String" },
    { name: `${$WEBVIZ_SOURCE_2}/foo`, datatypeName: "std_msgs/String", datatypeId: "std_msgs/String" },
    { name: "/baz/num", datatypeName: "baz/num", datatypeId: "baz/num" },
    { name: "/baz/text", datatypeName: "baz/text", datatypeId: "baz/text" },
    { name: "/baz/array", datatypeName: "baz/array", datatypeId: "baz/array" },
    { name: "/baz/array/obj", datatypeName: "baz/array/obj", datatypeId: "baz/array/obj" },
    { name: "/geometry/types", datatypeName: "geometry/types", datatypeId: "geometry/types" },
    { name: "/NaN", datatypeName: "baz/num", datatypeId: "baz/num" },
    { name: "/webviz_source_2/changed_datatype", datatypeName: "std_msgs/String", datatypeId: "std_msgs/String" },
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
          some_long_data: new Uint8Array(2000),
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
        message: {
          some_array: ["a", "b", "c", "d", "e", "f"],
          some_deleted_key: "GONE",
          some_id_example_2: { some_id: 123 },
        },
      },
    ],
    [`${$WEBVIZ_SOURCE_2}/foo`]: [
      {
        topic: `${$WEBVIZ_SOURCE_2}/foo`,
        receiveTime: { sec: 123, nsec: 456789011 },
        message: {
          some_array: ["a", "f", "n", "o", "p"],
          some_id_example_2: { some_id: 567 },
        },
      },
    ],
    "/baz/num": [
      {
        topic: "/baz/num",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: { value: 3425363211 },
      },
    ],
    "/baz/text": [
      {
        topic: "/baz/text",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          value: new Array(10).fill("string").join(" "),
          value_long: new Array(1024).fill("string").join(" "),
          value_with_newlines: new Array(1024)
            .fill()
            .map((_, i) => `this is line ${i} of the text`)
            .join("\n"),
        },
      },
    ],
    "/baz/array": [
      {
        topic: "/baz/array",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: { value: [false] },
      },
    ],
    "/baz/array/obj": [
      {
        topic: "/baz/array/obj",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: { value: [{ a: "b", c: "d", e: "f" }] },
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
    "/NaN": [
      {
        topic: "/NaN",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: { value: NaN },
      },
      {
        topic: "/NaN",
        receiveTime: { sec: 123, nsec: 456789013 },
        message: { value: NaN },
      },
    ],
    "/webviz_source_2/changed_datatype": [
      {
        topic: "/webviz_source_2/changed_datatype",
        receiveTime: { sec: 123, nsec: 456789013 },
        message: { field_name_not_in_datatype: "is visible" },
      },
    ],
  },
  datatypes: {
    "baz/num": { name: "baz/num", fields: [{ name: "value", type: "float64" }] },
    "baz/text": {
      name: "baz/text",
      fields: [
        { name: "value", type: "string" },
        { name: "value_long", type: "string" },
        { name: "value_with_newlines", type: "string" },
      ],
    },
    "baz/array": { name: "baz/array", fields: [{ name: "value", type: "bool", isArray: true }] },
    "baz/array/obj": {
      name: "baz/array/obj",
      fields: [{ name: "value", type: "baz/array/ace", isArray: true, isComplex: true }],
    },
    "baz/array/ace": {
      name: "baz/array/ace",
      fields: [{ name: "a", type: "string" }, { name: "c", type: "string" }, { name: "e", type: "string" }],
    },
    "geometry/types": {
      name: "geometry/types",
      fields: [
        { name: "point2d", type: "geometry/types/Point2", isComplex: true },
        { name: "point3d", type: "geometry/types/Point3", isComplex: true },
      ],
    },
    "geometry/types/Point2": {
      name: "geometry/types/Point2",
      fields: [{ name: "x", type: "float64" }, { name: "y", type: "float64" }],
    },
    "geometry/types/Point3": {
      name: "geometry/types/Point3",
      fields: [{ name: "x", type: "float64" }, { name: "y", type: "float64" }, { name: "z", type: "float64" }],
    },
    "std_msgs/String": { name: "std_msgs/String", fields: [{ name: "value", type: "string" }] },
    "msgs/big_topic": {
      name: "msgs/big_topic",
      fields: [
        { name: "LotsOfStuff", type: "msgs/LotsOfStuff", isComplex: true },
        { name: "timestamp_example_1", type: "time" },
        { name: "timestamp_example_2", type: "time" },
        { name: "timestamp_example_3", type: "time" },
        { name: "some_id_example_1", type: "msgs/has_id_1", isComplex: true },
        { name: "some_id_example_2", type: "msgs/has_id_2", isComplex: true },
        { name: "some_short_data", type: "int8", isArray: true },
        { name: "some_long_data", type: "uint8", isArray: true },
        { name: "some_float_data", type: "float64", isArray: true },
      ],
    },
    "msgs/LotsOfStuff": {
      name: "msgs/LotsOfStuff",
      fields: [
        { name: "SomeBoolean", type: "bool" },
        { name: "SomeInteger", type: "float64" },
        { name: "count", type: "int32" },
        { name: "time", type: "time" },
        { name: "valid", type: "bool" },
      ],
    },
    "msgs/has_id_1": {
      name: "msgs/has_id_1",
      fields: [{ name: "someId", type: "int32" }, { name: "additional_data", type: "int32" }],
    },
    "msgs/has_id_2": {
      name: "msgs/has_id_2",
      fields: [{ name: "some_id", type: "int32" }],
    },
  },
};

const ENUM_FIELDS = [
  { type: "uint8", name: "ERROR", isConstant: true, value: 0 },
  { type: "uint8", name: "OFF", isConstant: true, value: 1 },
  { type: "uint8", name: "BOOTING", isConstant: true, value: 2 },
  { type: "uint8", name: "ACTIVE", isConstant: true, value: 3 },
];

// separate fixture so that we only need to define datatypes for small subset of types
export const enumFixture = {
  datatypes: {
    "baz/enum": {
      name: "baz/enum",
      fields: [...ENUM_FIELDS, { type: "uint8", name: "value", isArray: false }],
    },
    "baz/EnumObjectArray": { name: "baz/EnumObjectArray", fields: [{ type: "baz/enum", name: "arr", isArray: true }] },
    "baz/EnumArray": {
      name: "baz/EnumArray",
      fields: [...ENUM_FIELDS, { type: "uint8", name: "value", isArray: true }],
    },
  },
  topics: [
    { name: "/baz/enum", datatypeName: "baz/enum", datatypeId: "baz/enum" },
    { name: "/baz/enum_object_array", datatypeName: "baz/EnumObjectArray", datatypeId: "baz/EnumObjectArray" },
    { name: "/baz/enum_array", datatypeName: "baz/EnumArray", datatypeId: "baz/EnumArray" },
  ],
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
    "/baz/enum_object_array": [
      {
        topic: "/baz/enum_object_array",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          arr: [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }],
        },
      },
    ],
    "/baz/enum_array": [
      {
        topic: "/baz/enum_array",
        receiveTime: { sec: 123, nsec: 456789012 },
        message: {
          value: [2, 2, 3],
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
      name: "baz/enum_advanced",
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
    "baz/enum_advanced_array": {
      name: "baz/enum_advanced_array",
      fields: [{ type: "baz/enum_advanced", name: "value", isArray: true, isComplex: true }],
    },
    "baz/animals": {
      name: "baz/animals",
      fields: [
        { type: "uint32", name: "CAT", isConstant: true, value: 10000 },
        { type: "uint32", name: "DOG", isConstant: true, value: 10001 },
      ],
    },
  },
  topics: [{ name: "/baz/enum_advanced", datatypeName: "baz/enum_advanced", datatypeId: "baz/enum_advanced" }],
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
      name: "baz/missing_data",
      fields: [{ type: "uint8", name: "value", isArray: false }],
    },
  },
  topics: [{ name: "/baz/missing_data", datatypeName: "baz/missing_data", datatypeId: "baz/missing_data" }],
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

export const topicsToDiffFixture = {
  datatypes: enumAdvancedFixture.datatypes,
  topics: [
    { name: "/baz/enum_advanced", datatypeName: "baz/enum_advanced", datatypeId: "baz/enum_advanced" },
    { name: "/another/baz/enum_advanced", datatypeName: "baz/enum_advanced", datatypeId: "baz/enum_advanced" },
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
    {
      name: "/baz/enum_advanced_array",
      datatypeName: "baz/enum_advanced_array",
      datatypeId: "baz/enum_advanced_array",
    },
    {
      name: "/another/baz/enum_advanced_array",
      datatypeName: "baz/enum_advanced_array",
      datatypeId: "baz/enum_advanced_array",
    },
  ],
  frame: {
    "/baz/enum_advanced_array": [
      {
        receiveTime: enumAdvancedFixture.frame["/baz/enum_advanced"][0].receiveTime,
        topic: "/baz/enum_advanced_array",
        message: {
          value: [
            { ...exampleMessage, toBeDeletedVal: "Bye!", toBeDeletedObj: { a: 1, b: 2, c: 3 }, id: 1 },
            { ...exampleMessage, id: 2 },
          ],
        },
      },
    ],
    "/another/baz/enum_advanced_array": [
      {
        receiveTime: enumAdvancedFixture.frame["/baz/enum_advanced"][0].receiveTime,
        topic: "/another/baz/enum_advanced_array",
        message: {
          value: [
            { ...exampleMessage, state: 5, id: 2 },
            { ...exampleMessage, state: 2, color: 3, newField: "hello", id: 1 },
          ],
        },
      },
    ],
  },
};

export const multipleNumberMessagesFixture = {
  datatypes: {
    multiple_number_messages: {
      name: "multiple_number_messages",
      fields: [{ type: "uint32", name: "value", isArray: false }],
    },
  },
  topics: [
    {
      name: "/multiple_number_messages",
      datatypeName: "multiple_number_messages",
      datatypeId: "multiple_number_messages",
    },
  ],
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
