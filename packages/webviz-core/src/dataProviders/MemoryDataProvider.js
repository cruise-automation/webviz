// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { last } from "lodash";
import { TimeUtil, type Time } from "rosbag";

import type {
  Connection,
  ExtensionPoint,
  InitializationResult,
  DataProviderMessage,
  DataProvider,
} from "webviz-core/src/dataProviders/types";
import type { Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

// In-memory data provider, for in tests.
export default class MemoryDataProvider implements DataProvider {
  messages: DataProviderMessage[];
  topics: ?(Topic[]);
  datatypes: ?RosDatatypes;
  connectionsByTopic: ?{ [topic: string]: Connection };
  extensionPoint: ExtensionPoint;
  initiallyLoaded: boolean;

  constructor({
    messages,
    topics,
    datatypes,
    initiallyLoaded,
    connectionsByTopic,
  }: {
    messages: DataProviderMessage[],
    topics?: Topic[],
    datatypes?: RosDatatypes,
    connectionsByTopic?: { [topic: string]: Connection },
    initiallyLoaded?: boolean,
  }) {
    this.messages = messages;
    this.topics = topics;
    this.datatypes = datatypes;
    this.connectionsByTopic = connectionsByTopic;
    this.initiallyLoaded = !!initiallyLoaded;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this.extensionPoint = extensionPoint;

    if (!this.initiallyLoaded) {
      // Report progress during `initialize` to state intention to provide progress (for testing)
      this.extensionPoint.progressCallback({
        fullyLoadedFractionRanges: [{ start: 0, end: 0 }],
      });
    }

    return {
      start: this.messages[0].receiveTime,
      end: last(this.messages).receiveTime,
      topics: this.topics || [],
      datatypes: this.datatypes || {},
      connectionsByTopic: this.connectionsByTopic,
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
