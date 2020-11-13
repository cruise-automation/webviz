// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import memoizeWeak from "memoize-weak";
import { type Time } from "rosbag";

import { MESSAGE_FORMATS } from "webviz-core/src/dataProviders/constants";
import type { BlockCache, MemoryCacheBlock } from "webviz-core/src/dataProviders/MemoryCacheDataProvider";
import type {
  DataProviderDescriptor,
  ExtensionPoint,
  GetDataProvider,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
  DataProvider,
} from "webviz-core/src/dataProviders/types";
import filterMap from "webviz-core/src/filterMap";
import type { Message, Progress, Topic } from "webviz-core/src/players/types";

export default class RenameDataProvider implements DataProvider {
  _provider: DataProvider;
  _prefix: string;

  constructor(args: {| prefix?: string |}, children: DataProviderDescriptor[], getDataProvider: GetDataProvider) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to RenameDataProvider: ${children.length}`);
    }
    if (args.prefix && !args.prefix.startsWith("/")) {
      throw new Error(`Prefix must have a leading forward slash: ${JSON.stringify(args.prefix)}`);
    }
    this._provider = getDataProvider(children[0]);
    this._prefix = args.prefix || "";
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const childExtensionPoint = {
      progressCallback: (progress: Progress) => {
        extensionPoint.progressCallback({
          // Only map fields that we know are correctly mapped. Don't just splat in `...progress` here
          // because we might miss an important mapping!
          fullyLoadedFractionRanges: progress.fullyLoadedFractionRanges,
          messageCache: progress.messageCache ? this._mapMessageCache(progress.messageCache) : undefined,
        });
      },
      reportMetadataCallback: extensionPoint.reportMetadataCallback,
    };
    const result = await this._provider.initialize(childExtensionPoint);
    const { messageDefinitions } = result;

    const convertTopicNameKey = (objWithTopicNameKeys) => {
      const topicKeyResult = {};
      for (const topicName of Object.keys(objWithTopicNameKeys)) {
        topicKeyResult[`${this._prefix}${topicName}`] = objWithTopicNameKeys[topicName];
      }
      return topicKeyResult;
    };
    let newMessageDefinitions;
    if (messageDefinitions.type === "parsed") {
      newMessageDefinitions = {
        type: "parsed",
        datatypes: messageDefinitions.datatypes,
        messageDefinitionsByTopic: convertTopicNameKey(messageDefinitions.messageDefinitionsByTopic),
        parsedMessageDefinitionsByTopic: convertTopicNameKey(messageDefinitions.parsedMessageDefinitionsByTopic),
      };
    } else {
      newMessageDefinitions = {
        type: "raw",
        messageDefinitionsByTopic: convertTopicNameKey(messageDefinitions.messageDefinitionsByTopic),
        messageDefinitionMd5SumByTopic: messageDefinitions.messageDefinitionMd5SumByTopic
          ? convertTopicNameKey(messageDefinitions.messageDefinitionMd5SumByTopic)
          : undefined,
      };
    }

    return {
      ...result,
      topics: filterMap(result.topics, (topic: Topic) => ({
        // Only map fields that we know are correctly mapped. Don't just splat in `...topic` here
        // because we might miss an important mapping!
        name: `${this._prefix}${topic.name}`,
        originalTopic: topic.name,
        datatype: topic.datatype, // TODO(JP): We might want to map datatypes with a prefix in the future, to avoid collisions.
        numMessages: topic.numMessages,
      })),
      messageDefinitions: newMessageDefinitions,
    };
  }

  async close(): Promise<void> {
    return this._provider.close();
  }

  _mapMessage = (message: Message) => ({
    // Only map fields that we know are correctly mapped. Don't just splat in `...message` here
    // because we might miss an important mapping!
    topic: `${this._prefix}${message.topic}`,
    receiveTime: message.receiveTime,
    message: message.message,
  });

  async getMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    const childTopics = {};
    for (const type of MESSAGE_FORMATS) {
      if (topics[type]) {
        childTopics[type] = topics[type].map((topic) => {
          if (!topic.startsWith(this._prefix)) {
            throw new Error("RenameDataProvider#getMessages called with topic that doesn't match prefix");
          }
          return topic.slice(this._prefix.length);
        });
      }
    }
    const messages = await this._provider.getMessages(start, end, childTopics);
    const { parsedMessages, rosBinaryMessages, bobjects } = messages;

    return {
      parsedMessages: parsedMessages && parsedMessages.map(this._mapMessage),
      rosBinaryMessages: rosBinaryMessages && rosBinaryMessages.map(this._mapMessage),
      bobjects: bobjects && bobjects.map(this._mapMessage),
    };
  }

  _mapMessageCache = memoizeWeak(
    (messageCache: BlockCache): BlockCache => ({
      // Note: don't just map(this._mapBlock) because map also passes the array and defeats the
      // memoization.
      blocks: messageCache.blocks.map((block) => this._mapBlock(block)),
      startTime: messageCache.startTime,
    })
  );

  _mapBlock = memoizeWeak(
    (block: ?MemoryCacheBlock): ?MemoryCacheBlock => {
      if (!block) {
        return;
      }

      const messagesByTopic = {};
      for (const topicName of Object.keys(block.messagesByTopic)) {
        messagesByTopic[`${this._prefix}${topicName}`] = block.messagesByTopic[topicName].map(this._mapMessage);
      }
      return { messagesByTopic, sizeInBytes: block.sizeInBytes };
    }
  );
}
