// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Time } from "rosbag";

import { type DataProvider, type DataProviderMessage, type InitializationResult, type ExtensionPoint } from "./types";
import type { DataProviderDescriptor, Connection, GetDataProvider } from "webviz-core/src/dataProviders/types";
import filterMap from "webviz-core/src/filterMap";
import MessageReaderStore from "webviz-core/src/util/MessageReaderStore";
import reportError from "webviz-core/src/util/reportError";

const readers = new MessageReaderStore();

// Parses raw messages as returned by `BagDataProvider`.
export default class ParseMessagesDataProvider implements DataProvider {
  _provider: DataProvider;
  _connectionsByTopic: { [topic: string]: Connection } = {};

  constructor(_: {}, children: DataProviderDescriptor[], getDataProvider: GetDataProvider) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to ParseMessagesDataProvider: ${children.length}`);
    }
    this._provider = getDataProvider(children[0]);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const { connectionsByTopic, ...otherResults } = await this._provider.initialize(extensionPoint);
    if (!connectionsByTopic) {
      throw new Error("ParseMessagesDataProvider can only be used with a provider that produces `connectionsByTopic`");
    }
    this._connectionsByTopic = connectionsByTopic;
    return { ...otherResults };
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<DataProviderMessage[]> {
    const allMessages = await this._provider.getMessages(start, end, topics);
    return filterMap(allMessages, (message) => {
      const connection = this._connectionsByTopic[message.topic];
      if (!connection) {
        throw new Error("Could not find connection in bag for message");
      }
      const { type, md5sum, messageDefinition } = connection;
      const reader = readers.get(type, md5sum, messageDefinition);
      try {
        return {
          ...message,
          message: reader.readMessage(Buffer.from(message.message)),
        };
      } catch (error) {
        reportError(`Error reading messages from ${message.topic}: ${error.message}`, error, "user");
        return undefined;
      }
    });
  }

  close(): Promise<void> {
    return this._provider.close();
  }
}
