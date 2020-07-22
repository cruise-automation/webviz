// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { assign, flatten, isEqual } from "lodash";
import memoizeWeak from "memoize-weak";
import { TimeUtil, type Time } from "rosbag";

import type { BlockCache } from "webviz-core/src/dataProviders/MemoryCacheDataProvider";
import type {
  DataProviderDescriptor,
  ExtensionPoint,
  GetDataProvider,
  InitializationResult,
  DataProvider,
} from "webviz-core/src/dataProviders/types";
import type { Message, Progress } from "webviz-core/src/players/types";
import type { RosMsgField } from "webviz-core/src/types/RosDatatypes";
import { deepIntersect } from "webviz-core/src/util/ranges";
import { clampTime } from "webviz-core/src/util/time";

const sortTimes = (times: Time[]) => times.sort(TimeUtil.compare);

const memoizedMergedBlock = memoizeWeak((block1, block2) => {
  if (block1 == null) {
    return block2;
  }
  if (block2 == null) {
    return block1;
  }
  return {
    messagesByTopic: { ...block1.messagesByTopic, ...block2.messagesByTopic },
    sizeInBytes: block1.sizeInBytes + block2.sizeInBytes,
  };
});

// Exported for tests
export const mergedBlocks = (cache1: ?BlockCache, cache2: ?BlockCache): ?BlockCache => {
  if (cache1 == null) {
    return cache2;
  }
  if (cache2 == null) {
    return cache1;
  }
  if (!TimeUtil.areSame(cache1.startTime, cache2.startTime)) {
    // TODO(JP): Actually support merging of blocks for different start times. Or not bother at all,
    // and move the CombinedDataProvider to above the MemoryCacheDataProvider, so we don't have to do
    // block merging at all.
    return cache1;
  }
  const blocks = [];
  for (let i = 0; i < cache1.blocks.length || i < cache2.blocks.length; ++i) {
    blocks.push(memoizedMergedBlock(cache1.blocks[i], cache2.blocks[i]));
  }
  return { blocks, startTime: cache1.startTime };
};

const merge = (messages1: Message[], messages2: Message[]) => {
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

const throwOnDuplicateTopics = (topics: string[]) => {
  [...topics].sort().forEach((topicName, i, sortedTopics) => {
    if (sortedTopics[i + 1] && topicName === sortedTopics[i + 1]) {
      throw new Error(`Duplicate topic found: ${topicName}`);
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

const throwOnMixedParsedMessages = (childProvidesParsedMessages: boolean[]) => {
  if (childProvidesParsedMessages.includes(true) && childProvidesParsedMessages.includes(false)) {
    throw new Error("Data providers provide different message formats");
  }
};

function intersectProgress(progresses: Progress[]): Progress {
  if (progresses.length === 0) {
    return { fullyLoadedFractionRanges: [] };
  }

  let messageCache: ?BlockCache;
  for (const progress of progresses) {
    messageCache = mergedBlocks(messageCache, progress.messageCache);
  }

  return {
    fullyLoadedFractionRanges: deepIntersect(progresses.map((p) => p.fullyLoadedFractionRanges).filter(Boolean)),
    ...(messageCache != null ? { messageCache } : undefined),
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
  _providers: DataProvider[];
  _initializationResultsPerProvider: { start: Time, end: Time, topicSet: Set<string> }[] = [];
  _progressPerProvider: (Progress | null)[];
  _extensionPoint: ExtensionPoint;

  constructor(_: {}, children: DataProviderDescriptor[], getDataProvider: GetDataProvider) {
    this._providers = children.map((descriptor) =>
      process.env.NODE_ENV === "test" && descriptor.name === "TestProvider"
        ? descriptor.args.provider
        : getDataProvider(descriptor)
    );
    // initialize progress to an empty range for each provider
    this._progressPerProvider = children.map((__) => null);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this._extensionPoint = extensionPoint;
    const results: InitializationResult[] = [];
    this._initializationResultsPerProvider = [];
    // NOTE: Initialization is done serially instead of concurrently here as a
    // temporary workaround for a major IndexedDB bug that results in runaway
    // disk usage. See https://bugs.chromium.org/p/chromium/issues/detail?id=1035025
    for (let idx = 0; idx < this._providers.length; idx++) {
      const provider = this._providers[idx];
      const childExtensionPoint = {
        progressCallback: (progress: Progress) => {
          this._updateProgressForChild(idx, progress);
        },
        reportMetadataCallback: extensionPoint.reportMetadataCallback,
      };
      const result = await provider.initialize(childExtensionPoint);
      results.push(result);

      this._initializationResultsPerProvider.push({
        start: result.start,
        end: result.end,
        topicSet: new Set(result.topics.map((t) => t.name)),
      });
    }

    // Any providers that didn't report progress in `initialize` are assumed fully loaded
    this._progressPerProvider.forEach((p, i) => {
      this._progressPerProvider[i] = p || fullyLoadedProgress();
    });

    const start = sortTimes(results.map((result) => result.start)).shift();
    const end = sortTimes(results.map((result) => result.end)).pop();

    // Error handling
    const mergedTopics = flatten(results.map(({ topics }) => topics));
    throwOnDuplicateTopics(mergedTopics.map(({ name }) => name));
    throwOnDuplicateTopics(
      flatten(results.map(({ messageDefinitionsByTopic }) => Object.keys(messageDefinitionsByTopic)))
    );
    // $FlowFixMe - flow does not work with Object.entries :(
    throwOnUnequalDatatypes(flatten(results.map(({ datatypes }) => Object.entries(datatypes))));
    throwOnMixedParsedMessages(results.map(({ providesParsedMessages }) => providesParsedMessages));

    return {
      start,
      end,
      topics: mergedTopics,
      datatypes: assign({}, ...results.map(({ datatypes }) => datatypes)),
      providesParsedMessages: results.length ? results[0].providesParsedMessages : true,
      messageDefinitionsByTopic: assign(
        {},
        ...results.map(({ messageDefinitionsByTopic }) => messageDefinitionsByTopic)
      ),
    };
  }

  async close(): Promise<void> {
    await Promise.all(this._providers.map((provider) => provider.close()));
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<Message[]> {
    const messagesPerProvider = await Promise.all(
      this._providers.map(async (provider, index) => {
        const initializationResult = this._initializationResultsPerProvider[index];
        const availableTopics = initializationResult.topicSet;
        const filteredTopics = topics.filter((topic) => availableTopics.has(topic));
        if (!filteredTopics.length) {
          // If we don't need any topics from this provider, we shouldn't call getMessages at all.  Therefore,
          // the provider doesn't know that we currently don't care about any of its topics, so it won't report
          // its progress as being fully loaded, so we'll have to do that here ourselves.
          this._updateProgressForChild(index, fullyLoadedProgress());
          return [];
        }
        if (
          TimeUtil.isLessThan(end, initializationResult.start) ||
          TimeUtil.isLessThan(initializationResult.end, start)
        ) {
          // If we're totally out of bounds for this provider, we shouldn't call getMessages at all.
          return [];
        }
        const clampedStart = clampTime(start, initializationResult.start, initializationResult.end);
        const clampedEnd = clampTime(end, initializationResult.start, initializationResult.end);
        const messages = await provider.getMessages(clampedStart, clampedEnd, filteredTopics);
        for (const message of messages) {
          if (!availableTopics.has(message.topic)) {
            throw new Error(`Saw unexpected topic from provider ${index}: ${message.topic}`);
          }
        }
        return messages;
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
