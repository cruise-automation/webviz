// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { uniq } from "lodash";
import { type Time } from "rosbag";

import { type DataProvider, type InitializationResult, type ExtensionPoint } from "./types";
import ParsedMessageCache from "webviz-core/src/dataProviders/ParsedMessageCache";
import type {
  DataProviderDescriptor,
  GetDataProvider,
  GetMessagesResult,
  GetMessagesTopics,
} from "webviz-core/src/dataProviders/types";

type Args = $ReadOnly<{||}>;

// Parses raw messages as returned by `BagDataProvider`. To make it fast to seek back and forth, we keep
// a small cache here, which maps messages from the underlying DataProvider to parsed messages. This assumes
// that usually the underlying DataProvider will give us the same message references, and fast, which should
// be the case when using the MemoryCacheDataProvider.
export default class ParseMessagesDataProvider implements DataProvider {
  // Underlying DataProvider.
  _provider: DataProvider;
  // Passed into `initialize`.
  _messageCache = new ParsedMessageCache();

  constructor(_args: Args, children: DataProviderDescriptor[], getDataProvider: GetDataProvider) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to ParseMessagesDataProvider: ${children.length}`);
    }
    this._provider = getDataProvider(children[0]);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const result = await this._provider.initialize(extensionPoint);
    if (result.providesParsedMessages) {
      throw new Error("ParseMessagesDataProvider should not be used with a provider provides already-parsed messages");
    }
    if (result.messageDefinitions.type !== "parsed") {
      throw new Error("ParseMessagesDataProvider requires parsed message definitions");
    }
    return { ...result, providesParsedMessages: true };
  }

  async getMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    const requestedParsedTopics = new Set(topics.parsedMessages);
    const requestedBinaryTopics = new Set(topics.bobjects);
    const childTopics = { bobjects: uniq([...requestedParsedTopics, ...requestedBinaryTopics]) };
    // Kick off the request to the data provder to get the messages.
    const getMessagesPromise = this._provider.getMessages(start, end, childTopics);
    const { bobjects } = await getMessagesPromise;
    if (bobjects == null) {
      throw new Error("Child of ParseMessagesProvider must provide binary messages");
    }
    const messagesToParse = bobjects.filter(({ topic }) => requestedParsedTopics.has(topic));
    const parsedMessages = this._messageCache.parseMessages(messagesToParse);

    return {
      parsedMessages: parsedMessages.filter(({ topic }) => requestedParsedTopics.has(topic)),
      bobjects: bobjects.filter(({ topic }) => requestedBinaryTopics.has(topic)),
      rosBinaryMessages: undefined,
    };
  }

  close(): Promise<void> {
    return this._provider.close();
  }
}
