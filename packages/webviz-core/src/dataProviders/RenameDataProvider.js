// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten } from "lodash";
import { type Time } from "rosbag";

import { MESSAGE_FORMATS } from "webviz-core/src/dataProviders/constants";
import type {
  DataProviderDescriptor,
  ExtensionPoint,
  GetDataProvider,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
  DataProvider,
  TopicMapping,
} from "webviz-core/src/dataProviders/types";
import type { Message } from "webviz-core/src/players/types";

export default class RenameDataProvider implements DataProvider {
  _provider: DataProvider;
  _topicMapping: TopicMapping;
  // Note: in the player (and parent data provider), topics /foo and /some_prefix/foo might both map
  // to the topic /foo in the child data provider, depending on the contents of _topicMapping.
  _childToParentTopicMapping: { [string]: string[] } = {};
  _parentToChildTopicMapping: { [string]: string } = {};

  constructor(
    args: {| topicMapping: TopicMapping |},
    children: DataProviderDescriptor[],
    getDataProvider: GetDataProvider
  ) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to RenameDataProvider: ${children.length}`);
    }
    if (!Object.keys(args.topicMapping).every((prefix) => prefix.length === 0 || prefix.startsWith("/"))) {
      throw new Error(`Prefix must have a leading forward slash: ${JSON.stringify(Object.keys(args.topicMapping))}`);
    }
    this._provider = getDataProvider(children[0]);
    this._topicMapping = args.topicMapping;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const result = await this._provider.initialize(extensionPoint);
    const { messageDefinitions } = result;

    // Initialize topic mappings.
    Object.keys(this._topicMapping).forEach((prefix) => {
      const excludedTopics = new Set(this._topicMapping[prefix].excludeTopics);
      result.topics.forEach((topic) => {
        this._childToParentTopicMapping[topic.name] = this._childToParentTopicMapping[topic.name] ?? [];
        if (!excludedTopics.has(topic.name)) {
          const parentTopicName = `${prefix}${topic.name}`;
          this._childToParentTopicMapping[topic.name].push(parentTopicName);
          this._parentToChildTopicMapping[parentTopicName] = topic.name;
        }
      });
    });

    const convertTopicNameKey = (objWithChildTopicNameKeys) => {
      const topicKeyResult = {};
      for (const childTopicName of Object.keys(objWithChildTopicNameKeys)) {
        this._childToParentTopicMapping[childTopicName].forEach((parentTopicName) => {
          topicKeyResult[parentTopicName] = objWithChildTopicNameKeys[childTopicName];
        });
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
      topics: flatten(
        result.topics.map((topic) =>
          this._childToParentTopicMapping[topic.name].map((parentTopicName) => ({
            // Only map fields that we know are correctly mapped. Don't just splat in `...topic` here
            // because we might miss an important mapping!
            name: parentTopicName,
            originalTopic: topic.name,
            datatypeName: topic.datatypeName,
            datatypeId: topic.datatypeId,
            numMessages: topic.numMessages,
          }))
        )
      ),
      messageDefinitions: newMessageDefinitions,
    };
  }

  async close(): Promise<void> {
    return this._provider.close();
  }

  _mapMessages = (messages: $ReadOnlyArray<Message>, childTopicToParentTopics: { [string]: string[] }) => {
    const ret = [];
    for (const message of messages) {
      for (const parentTopic of childTopicToParentTopics[message.topic]) {
        ret.push({
          // Only map fields that we know are correctly mapped. Don't just splat in `...message` here
          // because we might miss an important mapping!
          topic: parentTopic,
          receiveTime: message.receiveTime,
          message: message.message,
        });
      }
    }
    return ret;
  };

  async getMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    const childTopics = {};
    const requestedChildTopicsToParentTopicsByType = {
      parsedMessages: {},
      rosBinaryMessages: {},
      bobjects: {},
    };
    for (const type of MESSAGE_FORMATS) {
      const requestedChildTopicsToParentTopics = requestedChildTopicsToParentTopicsByType[type];
      if (topics[type] == null) {
        childTopics[type] = null;
        continue;
      }
      if (topics[type]) {
        topics[type].forEach((parentTopicName) => {
          const childTopicName = this._parentToChildTopicMapping[parentTopicName];
          requestedChildTopicsToParentTopics[childTopicName] = requestedChildTopicsToParentTopics[childTopicName] ?? [];
          requestedChildTopicsToParentTopics[childTopicName].push(parentTopicName);
        });
      }
      childTopics[type] = Object.keys(requestedChildTopicsToParentTopics);
    }
    const messages = await this._provider.getMessages(start, end, childTopics);
    const { parsedMessages, rosBinaryMessages, bobjects } = messages;

    // If a child topic maps to several parent topics, only return messages for requested parent
    // topics.
    return {
      parsedMessages:
        parsedMessages && this._mapMessages(parsedMessages, requestedChildTopicsToParentTopicsByType.parsedMessages),
      rosBinaryMessages:
        rosBinaryMessages &&
        this._mapMessages(rosBinaryMessages, requestedChildTopicsToParentTopicsByType.rosBinaryMessages),
      bobjects: bobjects && this._mapMessages(bobjects, requestedChildTopicsToParentTopicsByType.bobjects),
    };
  }

  setUserNodes() {
    throw new Error("Not implemented");
  }
  setGlobalVariables() {
    throw new Error("Not implemented");
  }
}
