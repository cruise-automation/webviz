// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten, uniq, isEqual } from "lodash";
import { TimeUtil, type Time } from "rosbag";

import type {
  DataProviderDescriptor,
  DataProviderMetadata,
  ExtensionPoint,
  GetDataProvider,
  InitializationResult,
  DataProviderMessage,
  DataProvider,
} from "webviz-core/src/dataProviders/types";
import type { Progress, Topic } from "webviz-core/src/players/types";
import type { RosMsgField } from "webviz-core/src/types/RosDatatypes";
import naturalSort from "webviz-core/src/util/naturalSort";
import { deepIntersect } from "webviz-core/src/util/ranges";
import { clampTime } from "webviz-core/src/util/time";

export type ProviderInfo = { prefix?: string, deleteTopics?: string[] };
type InternalProviderInfo = { provider: DataProvider, prefix?: string, deleteTopics?: string[] };

const sortTimes = (times: Time[]) => times.sort(TimeUtil.compare);

const mapTopics = (topics: Topic[], { provider, prefix }: InternalProviderInfo): Topic[] => {
  if (!prefix) {
    return topics;
  }
  return topics.map((topic) => ({
    ...topic,
    name: `${prefix}${topic.name}`,
    originalTopic: topic.name,
  }));
};

const merge = (messages1: DataProviderMessage[], messages2: DataProviderMessage[]) => {
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

function intersectProgress(progresses: Progress[]): Progress {
  if (progresses.length === 0) {
    return { fullyLoadedFractionRanges: [] };
  }

  return {
    fullyLoadedFractionRanges: deepIntersect(progresses.map((p) => p.fullyLoadedFractionRanges).filter(Boolean)),
  };
}
function emptyProgress() {
  return { fullyLoadedFractionRanges: [{ start: 0, end: 0 }] };
}
function fullyLoadedProgress() {
  return { fullyLoadedFractionRanges: [{ start: 0, end: 1 }] };
}

// A DataProvider that combines multiple underlying DataProviders, optionally adding topic prefixes
// or removing certain topics.
export default class CombinedDataProvider implements DataProvider {
  _providers: InternalProviderInfo[];
  _initializationResultsPerProvider: { start: Time, end: Time, topicSet: Set<string> }[] = [];
  _progressPerProvider: (Progress | null)[];
  _extensionPoint: ExtensionPoint;

  constructor(
    { providerInfos }: {| providerInfos: ProviderInfo[] |},
    children: DataProviderDescriptor[],
    getDataProvider: GetDataProvider
  ) {
    if (providerInfos.length !== children.length) {
      throw new Error(
        `Number of providerInfos (${providerInfos.length}) does not match number of children (${children.length})`
      );
    }
    const prefixes = providerInfos.filter(({ prefix }) => prefix).map(({ prefix }) => prefix);
    if (uniq(prefixes).length !== prefixes.length) {
      throw new Error(`Duplicate prefixes are not allowed: ${JSON.stringify(prefixes)}`);
    }
    if (prefixes.find((prefix) => prefix && !prefix.startsWith("/"))) {
      throw new Error(`Each prefix must have a leading forward slash: ${JSON.stringify(prefixes)}`);
    }

    this._providers = providerInfos.map((providerInfo, index) => ({
      ...providerInfo,
      provider:
        process.env.NODE_ENV === "test" && children[index].name === "TestProvider"
          ? children[index].args.provider
          : getDataProvider(children[index]),
    }));
    // initialize progress to an empty range for each provider
    this._progressPerProvider = providerInfos.map((_) => null);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this._extensionPoint = extensionPoint;
    const results: InitializationResult[] = [];
    // NOTE: Initialization is done serially instead of concurrently here as a
    // temporary workaround for a major IndexedDB bug that results in runaway
    // disk usage. TODO: Reference chromium ticket.
    for (let idx = 0; idx < this._providers.length; idx++) {
      const { provider } = this._providers[idx];
      const childExtensionPoint = {
        progressCallback: (progress: Progress) => {
          this._updateProgressForChild(idx, progress);
        },
        reportMetadataCallback: (data: DataProviderMetadata) => {
          extensionPoint.reportMetadataCallback(data);
        },
      };
      const result = await provider.initialize(childExtensionPoint);
      results.push(result);
    }

    // Any providers that didn't report progress in `initialize` are assumed fully loaded
    this._progressPerProvider.forEach((p, i) => {
      this._progressPerProvider[i] = p || fullyLoadedProgress();
    });

    const start = sortTimes(results.map((result) => result.start)).shift();
    const end = sortTimes(results.map((result) => result.end)).pop();

    this._initializationResultsPerProvider = [];
    let topics: Topic[] = [];
    results.forEach((result, i) => {
      const deleteTopics: string[] = this._providers[i].deleteTopics || [];
      const filteredTopics: Topic[] = result.topics.filter(({ name }) => !deleteTopics.includes(name));
      topics = [...topics, ...mapTopics(filteredTopics, this._providers[i])];

      this._initializationResultsPerProvider.push({
        start: result.start,
        end: result.end,
        topicSet: new Set(filteredTopics.map((t) => t.name)),
      });
    });

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

  async getMessages(start: Time, end: Time, topics: string[]): Promise<DataProviderMessage[]> {
    const messagesPerProvider = await Promise.all(
      this._providers.map(async ({ provider, prefix }, index) => {
        const initializationResult = this._initializationResultsPerProvider[index];
        const availableTopics = initializationResult.topicSet;
        const filteredTopics = topics
          .map((topic) => topic.slice((prefix || "").length))
          .filter((topic) => availableTopics.has(topic));
        if (!filteredTopics.length) {
          // If we don't need any topics from this provider, we shouldn't call getMessages at all.  Therefore,
          // the provider doesn't know that we currently don't care about any of its topics, so it won't report
          // its progress as being fully loaded, so we'll have to do that here ourselves.
          this._updateProgressForChild(index, fullyLoadedProgress());
          return Promise.resolve([]);
        }
        if (
          TimeUtil.isLessThan(end, initializationResult.start) ||
          TimeUtil.isLessThan(initializationResult.end, start)
        ) {
          // If we're totally out of bounds for this provider, we shouldn't call getMessages at all.
          return Promise.resolve([]);
        }
        const clampedStart = clampTime(start, initializationResult.start, initializationResult.end);
        const clampedEnd = clampTime(end, initializationResult.start, initializationResult.end);
        const messages = await provider.getMessages(clampedStart, clampedEnd, filteredTopics);
        for (const message of messages) {
          if (!availableTopics.has(message.topic)) {
            throw new Error(`Saw unexpected topic from provider ${index}: ${message.topic}`);
          }
        }
        return Promise.resolve(messages.map((message) => ({ ...message, topic: `${prefix || ""}${message.topic}` })));
      })
    );

    let mergedMessages = [];
    for (const messages of messagesPerProvider) {
      mergedMessages = merge(mergedMessages, messages);
    }
    return mergedMessages;
  }

  _updateProgressForChild(providerIdx: number, progress: Progress) {
    this._progressPerProvider[providerIdx] = progress;
    // Assume empty for unreported progress
    const cleanProgresses = this._progressPerProvider.map((p) => p || emptyProgress());
    const intersected = intersectProgress(cleanProgresses);
    this._extensionPoint.progressCallback(intersected);
  }
}
