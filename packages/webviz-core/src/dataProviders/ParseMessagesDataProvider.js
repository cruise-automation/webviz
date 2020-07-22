// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Time, MessageReader, parseMessageDefinition } from "rosbag";

import { type DataProvider, type InitializationResult, type ExtensionPoint } from "./types";
import { getExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import ParsedMessageCache from "webviz-core/src/dataProviders/ParsedMessageCache";
import type { DataProviderDescriptor, GetDataProvider, GetMessagesExtra } from "webviz-core/src/dataProviders/types";
import type { Message, MessageDefinitionsByTopic } from "webviz-core/src/players/types";
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

  async getMessages(start: Time, end: Time, topics: string[], extra?: ?GetMessagesExtra): Promise<Message[]> {
    // Kick off the request to the data provder to get the messages.
    const allMessagesPromise = this._provider.getMessages(start, end, topics);
    // Make sure that all messages are here and all readers are initialized before doing any parsing.
    if (!this._calledInitializeReaders) {
      const readersInitializedPromise = this._initializeReaders();
      await Promise.all([allMessagesPromise, readersInitializedPromise]);
    }
    let allMessages = await allMessagesPromise;
    if (getExperimentalFeature("preloading") && extra) {
      allMessages = allMessages.filter((message) => !extra.topicsToOnlyLoadInBlocks.has(message.topic));
    }
    return this._messageCache.parseMessages(allMessages, this._readersByTopic);
  }

  close(): Promise<void> {
    return this._provider.close();
  }
}
