// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { assign, flatten, isEqual } from "lodash";
import memoizeWeak from "memoize-weak";
import allSettled from "promise.allsettled";
import { TimeUtil, type Time, type RosMsgField } from "rosbag";

import rawMessageDefinitionsToParsed from "./rawMessageDefinitionsToParsed";
import type { BlockCache } from "webviz-core/src/dataProviders/MemoryCacheDataProvider";
import type {
  DataProviderDescriptor,
  ExtensionPoint,
  GetDataProvider,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
  DataProvider,
  MessageDefinitions,
  ParsedMessageDefinitions,
} from "webviz-core/src/dataProviders/types";
import type { Message, Progress, Topic } from "webviz-core/src/players/types";
import { objectValues } from "webviz-core/src/util";
import { deepIntersect } from "webviz-core/src/util/ranges";
import sendNotification from "webviz-core/src/util/sendNotification";
import { clampTime } from "webviz-core/src/util/time";

const sortTimes = (times: Time[]) => times.sort(TimeUtil.compare);
const emptyGetMessagesResult = { rosBinaryMessages: undefined, bobjects: undefined, parsedMessages: undefined };

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

const merge = (messages1: ?$ReadOnlyArray<Message>, messages2: ?$ReadOnlyArray<Message>) => {
  if (messages1 == null) {
    return messages2;
  }
  if (messages2 == null) {
    return messages1;
  }
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

const mergeAllMessageTypes = (result1: GetMessagesResult, result2: GetMessagesResult): GetMessagesResult => ({
  bobjects: merge(result1.bobjects, result2.bobjects),
  parsedMessages: merge(result1.parsedMessages, result2.parsedMessages),
  rosBinaryMessages: merge(result1.rosBinaryMessages, result2.rosBinaryMessages),
});

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
// We parse all message definitions here and then merge them.
function mergeMessageDefinitions(messageDefinitionArr: MessageDefinitions[], topicsArr: Topic[][]): MessageDefinitions {
  const parsedMessageDefinitionArr: ParsedMessageDefinitions[] = messageDefinitionArr.map((messageDefinitions, index) =>
    rawMessageDefinitionsToParsed(messageDefinitions, topicsArr[index])
  );
  // $FlowFixMe - flow does not work with Object.entries :(
  throwOnUnequalDatatypes(flatten(parsedMessageDefinitionArr.map(({ datatypes }) => Object.entries(datatypes))));
  throwOnDuplicateTopics(
    flatten(parsedMessageDefinitionArr.map(({ messageDefinitionsByTopic }) => Object.keys(messageDefinitionsByTopic)))
  );
  throwOnDuplicateTopics(
    flatten(
      parsedMessageDefinitionArr.map(({ parsedMessageDefinitionsByTopic }) =>
        Object.keys(parsedMessageDefinitionsByTopic)
      )
    )
  );

  return {
    type: "parsed",
    messageDefinitionsByTopic: assign(
      {},
      ...parsedMessageDefinitionArr.map(({ messageDefinitionsByTopic }) => messageDefinitionsByTopic)
    ),
    parsedMessageDefinitionsByTopic: assign(
      {},
      ...parsedMessageDefinitionArr.map(({ parsedMessageDefinitionsByTopic }) => parsedMessageDefinitionsByTopic)
    ),
    datatypes: assign({}, ...parsedMessageDefinitionArr.map(({ datatypes }) => datatypes)),
  };
}

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

type ProcessedInitializationResult = $ReadOnly<{|
  start: Time,
  end: Time,
  topicSet: Set<string>,
|}>;

// A DataProvider that combines multiple underlying DataProviders, optionally adding topic prefixes
// or removing certain topics.
export default class CombinedDataProvider implements DataProvider {
  _providers: DataProvider[];
  // Initialization result will be null for providers that don't successfully initialize.
  _initializationResultsPerProvider: (?ProcessedInitializationResult)[] = [];
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

    const providerInitializePromises = this._providers.map(async (provider, idx) => {
      const childExtensionPoint = {
        progressCallback: (progress: Progress) => {
          this._updateProgressForChild(idx, progress);
        },
        reportMetadataCallback: extensionPoint.reportMetadataCallback,
      };
      return provider.initialize(childExtensionPoint);
    });
    const initializeOutcomes = await allSettled(providerInitializePromises);
    const results = initializeOutcomes.filter(({ status }) => status === "fulfilled").map(({ value }) => value);
    this._initializationResultsPerProvider = initializeOutcomes.map((outcome) => {
      if (outcome.status === "fulfilled") {
        const { start, end, topics } = outcome.value;
        return { start, end, topicSet: new Set(topics.map((t) => t.name)) };
      }
      sendNotification("Data unavailable", outcome.reason, "user", "warn");
      return null;
    });
    if (initializeOutcomes.every(({ status }) => status === "rejected")) {
      return new Promise(() => {}); // Just never finish initializing.
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
    throwOnMixedParsedMessages(results.map(({ providesParsedMessages }) => providesParsedMessages));
    const combinedMessageDefinitions = mergeMessageDefinitions(
      results.map(({ messageDefinitions }) => messageDefinitions),
      results.map(({ topics }) => topics)
    );

    return {
      start,
      end,
      topics: mergedTopics,
      providesParsedMessages: results.length ? results[0].providesParsedMessages : false,
      messageDefinitions: combinedMessageDefinitions,
    };
  }

  async close(): Promise<void> {
    await Promise.all(this._providers.map((provider) => provider.close()));
  }

  async getMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    const messagesPerProvider = await Promise.all(
      this._providers.map(async (provider, index) => {
        const initializationResult = this._initializationResultsPerProvider[index];
        if (initializationResult == null) {
          return { bobjects: undefined, parsedMessages: undefined, rosBinaryMessages: undefined };
        }
        const availableTopics = initializationResult.topicSet;
        const filterTopics = (maybeTopics) => maybeTopics && maybeTopics.filter((topic) => availableTopics.has(topic));
        const filteredTopicsByFormat = {
          bobjects: filterTopics(topics.bobjects),
          parsedMessages: filterTopics(topics.parsedMessages),
          rosBinaryMessages: filterTopics(topics.rosBinaryMessages),
        };
        const hasSubscriptions = objectValues(filteredTopicsByFormat).some((formatTopics) => formatTopics?.length);
        if (!hasSubscriptions) {
          // If we don't need any topics from this provider, we shouldn't call getMessages at all.  Therefore,
          // the provider doesn't know that we currently don't care about any of its topics, so it won't report
          // its progress as being fully loaded, so we'll have to do that here ourselves.
          this._updateProgressForChild(index, fullyLoadedProgress());
          return emptyGetMessagesResult;
        }
        if (
          TimeUtil.isLessThan(end, initializationResult.start) ||
          TimeUtil.isLessThan(initializationResult.end, start)
        ) {
          // If we're totally out of bounds for this provider, we shouldn't call getMessages at all.
          return emptyGetMessagesResult;
        }
        const clampedStart = clampTime(start, initializationResult.start, initializationResult.end);
        const clampedEnd = clampTime(end, initializationResult.start, initializationResult.end);
        const providerResult = await provider.getMessages(clampedStart, clampedEnd, filteredTopicsByFormat);
        for (const messages of objectValues(providerResult)) {
          if (messages == null) {
            continue;
          }
          for (const message of messages) {
            if (!availableTopics.has(message.topic)) {
              throw new Error(`Saw unexpected topic from provider ${index}: ${message.topic}`);
            }
          }
        }
        return providerResult;
      })
    );

    let mergedMessages = emptyGetMessagesResult;
    for (const messages of messagesPerProvider) {
      mergedMessages = mergeAllMessageTypes(mergedMessages, messages);
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
