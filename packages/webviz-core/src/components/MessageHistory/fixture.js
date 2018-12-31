// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export const datatypes = {
  "topic/with/header": [{ name: "index", type: "int32" }, { name: "header", type: "std_msgs/Header" }],
  "topic/without/header": [{ name: "index", type: "int32" }],
  "std_msgs/Header": [
    { name: "seq", type: "uint32", isArray: false },
    { name: "stamp", type: "time", isArray: false },
    { name: "frame_id", type: "string", isArray: false },
  ],
};

export const messagesWithHeader = [
  {
    op: "message",
    datatype: "topic/with/header",
    topic: "/topic/with/header",
    receiveTime: { sec: 100, nsec: 0 },
    message: { index: 0, header: { stamp: { sec: 100, nsec: 0 } } },
  },
  {
    op: "message",
    datatype: "topic/with/header",
    topic: "/topic/with/header",
    receiveTime: { sec: 101, nsec: 0 },
    message: { index: 1, header: { stamp: { sec: 101, nsec: 0 } } },
  },
  {
    op: "message",
    datatype: "topic/with/header",
    topic: "/topic/with/header",
    receiveTime: { sec: 102, nsec: 0 },
    message: { index: 2, header: { stamp: { sec: 102, nsec: 0 } } },
  },
];
