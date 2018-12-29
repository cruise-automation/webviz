// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

export type InitializeMessage = {
  bagPath: File | string,
};

export type MessageRequest = {
  start: Time,
  end: Time,
  topics: string[],
};

export type RawMessage = {
  topic: string,
  buffer: ArrayBuffer,
  timestamp: Time,
};
