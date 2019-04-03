// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten, uniq, isEqual } from "lodash";
import { TimeUtil, type Time } from "rosbag";

import type { RandomAccessDataProvider, MessageLike, InitializationResult } from "./types";
import type { Topic } from "webviz-core/src/types/players";
import type { RosMsgField } from "webviz-core/src/types/RosDatatypes";
import naturalSort from "webviz-core/src/util/naturalSort";

type ProviderInfo = { provider: RandomAccessDataProvider, prefix?: string };

const sortTimes = (times: Time[]) => times.sort(TimeUtil.compare);

const mapTopics = (initializationResult: InitializationResult, { provider, prefix }: ProviderInfo) => {
  if (!prefix) {
    return initializationResult.topics;
  }
  return initializationResult.topics.map((topic) => ({
    ...topic,
    name: `${prefix}${topic.name}`,
    originalTopic: topic.name,
  }));
};

const merge = (messages1: MessageLike[], messages2: MessageLike[]) => {
  const messages = [];
  let index1 = 0;
  let index2 = 0;
  while (index1 < messages1.length && index2 < messages2.length) {
    if (TimeUtil.isGreaterThan(messages1[index1].receiveTime, messages2[index2].receiveTime)) {
      messages.push(messages2[index2++]);
    } else {
      messages.push(messages1[index1++]);
    }
  }
  while (index1 < messages1.length) {
    messages.push(messages1[index1++]);
  }
  while (index2 < messages2.length) {
    messages.push(messages2[index2++]);
  }
  return messages;
};

const throwOnDuplicateTopics = (topics: Topic[]) => {
  [...topics].sort(naturalSort("name")).forEach((topic, i, sortedTopics) => {
    if (sortedTopics[i + 1] && topic.name === sortedTopics[i + 1].name) {
      throw new Error(`Duplicate topic found: ${topic.name}`);
    }
  });
};

const throwOnUnequalDatatypes = (datatypes: [string, RosMsgField[]][]) => {
  datatypes
    .sort((a, b) => (a[0] && b[0] ? +(a[0][0] > b[0][0]) || -1 : 0))
    .forEach(([datatype, definition], i, sortedDataTypes) => {
      if (
        sortedDataTypes[i + 1] &&
        datatype === sortedDataTypes[i + 1][0] &&
        !isEqual(definition, sortedDataTypes[i + 1][1])
      ) {
        throw new Error(
          `Conflicting datatype definitions found for ${datatype}: ${JSON.stringify(definition)} !== ${JSON.stringify(
            sortedDataTypes[i + 1][1]
          )}`
        );
      }
    });
};

// a caching adapter for a DataProvider which does eager, non-blocking read ahead of time ranges
// based on a readAheadRange (default to 100 milliseconds)
export default class CombinedDataProvider implements RandomAccessDataProvider {
  _providers: ProviderInfo[];

  constructor(providers: ProviderInfo[]) {
    const prefixes = providers.filter(({ prefix }) => prefix).map(({ prefix }) => prefix);
    if (uniq(prefixes).length !== prefixes.length) {
      throw new Error(`Duplicate prefixes are not allowed: ${JSON.stringify(prefixes)}`);
    }
    if (prefixes.find((prefix) => prefix && !prefix.startsWith("/"))) {
      throw new Error(`Each prefix must have a leading forward slash: ${JSON.stringify(prefixes)}`);
    }

    this._providers = providers;
  }

  async initialize(): Promise<InitializationResult> {
    const results = await Promise.all(this._providers.map(({ provider }) => provider.initialize()));
    const start = sortTimes(results.map(({ start }) => start)).shift();
    const end = sortTimes(results.map(({ end }) => end)).pop();
    const topics = flatten(
      results.map((initializationResult, i) => mapTopics(initializationResult, this._providers[i]))
    );

    // Error handling
    throwOnDuplicateTopics([...topics]);
    // $FlowFixMe - flow does not work with Object.entries :(
    throwOnUnequalDatatypes(flatten(results.map(({ datatypes }) => Object.entries(datatypes))));

    return {
      start,
      end,
      topics,
      datatypes: results.reduce((prev, { datatypes }) => ({ ...prev, ...datatypes }), {}),
    };
  }

  async close(): Promise<void> {
    await Promise.all(this._providers.map(({ provider }) => provider.close()));
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]> {
    const messagesPerProvider = await Promise.all(
      this._providers.map(async ({ provider, prefix: suppliedPrefix }) => {
        const prefix = suppliedPrefix || "";
        const filteredTopics = (prefix ? topics.filter((topic) => topic.startsWith(prefix)) : topics).map((topic) =>
          topic.slice(prefix.length)
        );
        const messages = await provider.getMessages(start, end, filteredTopics);
        return Promise.resolve(messages.map((message) => ({ ...message, topic: `${prefix}${message.topic}` })));
      })
    );

    let mergedMessages = [];
    for (const messages of messagesPerProvider) {
      mergedMessages = merge(mergedMessages, messages);
    }
    return mergedMessages;
  }
}
