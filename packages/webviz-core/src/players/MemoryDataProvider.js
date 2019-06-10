// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { last } from "lodash";
import { TimeUtil, type Time } from "rosbag";

import type {
  ExtensionPoint,
  InitializationResult,
  MessageLike,
  RandomAccessDataProvider,
} from "webviz-core/src/players/types";
import type { Topic } from "webviz-core/src/types/players";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// In-memory data provider, for in tests.
export default class MemoryDataProvider implements RandomAccessDataProvider {
  messages: MessageLike[];
  topics: ?(Topic[]);
  datatypes: ?RosDatatypes;
  extensionPoint: ExtensionPoint;

  constructor({
    messages,
    topics,
    datatypes,
  }: {
    messages: MessageLike[],
    topics?: Topic[],
    datatypes?: RosDatatypes,
  }) {
    this.messages = messages;
    this.topics = topics;
    this.datatypes = datatypes;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this.extensionPoint = extensionPoint;

    return {
      start: this.messages[0].receiveTime,
      end: last(this.messages).receiveTime,
      topics: this.topics || [],
      datatypes: this.datatypes || {},
    };
  }

  async close(): Promise<void> {}

  async getMessages(start: Time, end: Time, topics: string[]) {
    const result = [];
    for (const message of this.messages) {
      if (TimeUtil.isGreaterThan(message.receiveTime, end)) {
        break;
      }
      if (TimeUtil.isLessThan(message.receiveTime, start)) {
        continue;
      }
      if (!topics.includes(message.topic)) {
        continue;
      }
      result.push(message);
    }
    return result;
  }
}
