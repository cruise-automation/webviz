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
          some_id_example_1: { someId: 123 },
          some_id_example_2: { some_id: 123 },
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
  },
};
