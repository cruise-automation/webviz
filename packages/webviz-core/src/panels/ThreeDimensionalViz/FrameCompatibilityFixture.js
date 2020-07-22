// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
export const datatypes = {
  "some/datatype": { fields: [{ name: "index", type: "int32" }] },
};

export const messages = [
  {
    topic: "/some/topic",
    receiveTime: { sec: 100, nsec: 0 },
    message: { index: 0 },
  },
  {
    topic: "/some/topic",
    receiveTime: { sec: 101, nsec: 0 },
    message: { index: 1 },
  },
  {
    topic: "/some/topic",
    receiveTime: { sec: 102, nsec: 0 },
    message: { index: 2 },
  },
];
