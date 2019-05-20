// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

export const datatypes = {
  "some/datatype": [{ name: "index", type: "int32" }],
};

export const messages = [
  {
    op: "message",
    datatype: "some/datatype",
    topic: "/some/topic",
    receiveTime: { sec: 100, nsec: 0 },
    message: { index: 0 },
  },
  {
    op: "message",
    datatype: "some/datatype",
    topic: "/some/topic",
    receiveTime: { sec: 101, nsec: 0 },
    message: { index: 1 },
  },
  {
    op: "message",
    datatype: "some/datatype",
    topic: "/some/topic",
    receiveTime: { sec: 102, nsec: 0 },
    message: { index: 2 },
  },
];

export const dualInputMessages: any[] = messages.map((msg, idx) => ({
  ...msg,
  topic: `${SECOND_BAG_PREFIX}${msg.topic}`,
  message: {
    index: idx + 3,
  },
}));
