// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniq } from "lodash";
import { type Time, MessageReader, parseMessageDefinition } from "rosbag";

import { type DataProvider, type InitializationResult, type ExtensionPoint } from "./types";
import ParsedMessageCache from "webviz-core/src/dataProviders/ParsedMessageCache";
import type {
  DataProviderDescriptor,
  GetDataProvider,
  GetMessagesResult,
  GetMessagesTopics,
} from "webviz-core/src/dataProviders/types";
import type { MessageDefinitionsByTopic } from "webviz-core/src/players/types";
import { FREEZE_MESSAGES } from "webviz-core/src/util/globalConstants";

// Parses raw messages as returned by `BagDataProvider`. To make it fast to seek back and forth, we keep
// a small cache here, which maps messages from the underlying DataProvider to parsed messages. This assumes
// that usually the underlying DataProvider will give us the same message references, and fast, which should
// be the case when using the MemoryCacheDataProvider.
export default class ParseMessagesDataProvider implements DataProvider {
  // Underlying DataProvider.
  _provider: DataProvider;
  // Passed into the constructor.
  _messageDefinitionsByTopic: ?MessageDefinitionsByTopic;
  _messageCache = new ParsedMessageCache();

  // Reader per topic, as generated from the underlying DataProvider's `initialize` function.
  _readersByTopic: { [topic: string]: MessageReader } = {};
  // Use this to signal that the _readersByTopic is fully initialized.
  _calledInitializeReaders = false;

  constructor(_: {}, children: DataProviderDescriptor[], getDataProvider: GetDataProvider) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to ParseMessagesDataProvider: ${children.length}`);
    }
    this._provider = getDataProvider(children[0]);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const result = await this._provider.initialize(extensionPoint);
    const { messageDefinitionsByTopic } = result;
    if (result.providesParsedMessages) {
      throw new Error("ParseMessagesDataProvider should not be used with a provider provides already-parsed messages");
    }
    if (!messageDefinitionsByTopic) {
      throw new Error(
        "ParseMessagesDataProvider can only be used with a provider that produces `messageDefinitionsByTopic`"
      );
    }
    this._messageDefinitionsByTopic = messageDefinitionsByTopic;
    // Initialize the readers asynchronously - we can load data without having the readers ready to parse it.
    return { ...result, providesParsedMessages: true };
  }

  async _initializeReaders() {
    this._calledInitializeReaders = true;
    if (!this._messageDefinitionsByTopic) {
      return;
    }

    this._readersByTopic = {};
    for (const topic of Object.keys(this._messageDefinitionsByTopic)) {
      const definition = this._messageDefinitionsByTopic[topic];
      const parsedDefinition = typeof definition === "string" ? parseMessageDefinition(definition) : definition;
      this._readersByTopic[topic] = new MessageReader(parsedDefinition, {
        freeze: FREEZE_MESSAGES,
      });
    }
  }

  async getMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    const requestedParsedTopics = new Set(topics.parsedMessages);
    const requestedBinaryTopics = new Set(topics.bobjects);
    // TODO(steel/hernan): Add bobject support.
    // For now we always request ROS binary messages and return no bobjects.
    const childTopics = {
      bobjects: uniq([...requestedParsedTopics, ...requestedBinaryTopics]),
    };
    // Kick off the request to the data provder to get the messages.
    const getMessagesPromise = this._provider.getMessages(start, end, childTopics);
    // Make sure that all messages are here and all readers are initialized before doing any parsing.
    if (!this._calledInitializeReaders) {
      const readersInitializedPromise = this._initializeReaders();
      await Promise.all([getMessagesPromise, readersInitializedPromise]);
    }
    const { bobjects } = await getMessagesPromise;
    if (bobjects == null) {
      throw new Error("Child of ParseMessagesProvider must provide binary messages");
    }
    const messagesToParse = bobjects.filter(({ topic }) => requestedParsedTopics.has(topic));

    // We need the RewriteMessagesDataProvider to return real bobjects. For the moment, returning
    // the ROS binary messages helps make tests slightly more useful.
    return {
      parsedMessages: this._messageCache.parseMessages(messagesToParse, this._readersByTopic),
      bobjects: bobjects.filter(({ topic }) => requestedBinaryTopics.has(topic)),
      rosBinaryMessages: undefined,
    };
  }

  close(): Promise<void> {
    return this._provider.close();
  }
}
