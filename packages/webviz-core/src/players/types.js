// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Time } from "rosbag";

import type { Progress, TopicMsg } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

export type MessageLike = {
  topic: string,
  receiveTime: Time,
  message: any,
};

export type InitializationResult = {
  start: Time,
  end: Time,
  topics: TopicMsg[],
  datatypes: RosDatatypes,
};

export type ExtensionPoint = {|
  progressCallback: (Progress) => void,
  addTopicsCallback: ((string[]) => void) => void,
|};

export interface RandomAccessDataProvider {
  // do any up-front initializing of the provider, and takes an optional extension point for
  // dispatching custom PlayerMessages with messageCallback and listening for topic change events
  initialize(extensionPoint: ?ExtensionPoint): Promise<InitializationResult>;

  // get messages for a time range inclusive of start and end matching any of the provided topics
  getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]>;

  // close the provider
  close(): Promise<void>;
}
