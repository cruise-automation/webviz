// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { TimeUtil, type Time } from "rosbag";

import { CoreDataProviders } from "webviz-core/src/dataProviders/constants";
import type {
  DataProvider,
  DataProviderDescriptor,
  ExtensionPoint,
  GetDataProvider,
  GetMessagesExtra,
  InitializationResult,
} from "webviz-core/src/dataProviders/types";
import type { Message } from "webviz-core/src/players/types";
import sendNotification from "webviz-core/src/util/sendNotification";
import { formatTimeRaw } from "webviz-core/src/util/time";

// We wrap every DataProvider in an ApiCheckerDataProvider to strictly enforce
// the API guarantees. This makes it harder to make mistakes with DataProviders,
// and allows you to rely on these guarantees when writing your own DataProviders
// or Players.
//
// Whenever possible we make these errors not prevent further playback, though
// if the API guarantees are violated, it is likely that the rest of the
// application doesn't work properly either. In any case, we surface the error
// clearly to the user.
//
// We run this in production too since the overhead is minimal and well worth
// the guarantees that this gives us.

export function instrumentTreeWithApiCheckerDataProvider(
  treeRoot: DataProviderDescriptor,
  depth: number = 0
): DataProviderDescriptor {
  return {
    name: CoreDataProviders.ApiCheckerDataProvider,
    args: { name: `${treeRoot.name}@${depth}` },
    children: [
      {
        ...treeRoot,
        children: treeRoot.children.map((node) => instrumentTreeWithApiCheckerDataProvider(node, depth + 1)),
      },
    ],
  };
}

export default class ApiCheckerDataProvider implements DataProvider {
  _name: string;
  _provider: DataProvider;
  _initializationResult: ?InitializationResult;
  _topicNames: string[] = [];
  _closed: boolean = false;

  constructor(args: { name: string }, children: DataProviderDescriptor[], getDataProvider: GetDataProvider) {
    this._name = args.name;
    if (children.length !== 1) {
      this._warn(`Required exactly 1 child, but received ${children.length}`);
      return;
    }
    this._provider = getDataProvider(children[0]);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    if (this._initializationResult) {
      this._warn("initialize was called for a second time");
    }
    const initializationResult = await this._provider.initialize(extensionPoint);
    this._initializationResult = initializationResult;

    if (initializationResult.topics.length === 0) {
      this._warn("No topics returned at all; should have thrown error instead (with details of why this is happening)");
    }
    for (const topic of initializationResult.topics) {
      this._topicNames.push(topic.name);
      if (!initializationResult.datatypes[topic.datatype]) {
        this._warn(`Topic "${topic.name}" datatype "${topic.datatype}" not present in datatypes`);
      }
      if (!initializationResult.providesParsedMessages && !initializationResult.messageDefinitionsByTopic[topic.name]) {
        this._warn(`Topic "${topic.name}"" not present in messageDefinitionsByTopic`);
      }
    }
    return this._initializationResult;
  }

  async getMessages(start: Time, end: Time, topics: string[], extra?: ?GetMessagesExtra): Promise<Message[]> {
    const initRes = this._initializationResult;
    if (!initRes) {
      this._warn("getMessages was called before initialize finished");
      // Need to return, otherwise we can't refer to initRes later, and this is a really bad violation anyway.
      return [];
    }
    if (TimeUtil.isLessThan(end, start)) {
      this._warn(`getMessages end (${formatTimeRaw(end)}) is before getMessages start (${formatTimeRaw(start)})`);
    }
    if (TimeUtil.isLessThan(start, initRes.start)) {
      this._warn(
        `getMessages start (${formatTimeRaw(start)}) is before global start (${formatTimeRaw(initRes.start)})`
      );
    }
    if (TimeUtil.isLessThan(initRes.end, end)) {
      this._warn(`getMessages end (${formatTimeRaw(end)}) is after global end (${formatTimeRaw(initRes.end)})`);
    }
    if (topics.length === 0) {
      this._warn("getMessages was called without any topics");
    }
    for (const topic of topics) {
      if (!this._topicNames.includes(topic)) {
        this._warn(
          `Requested topic (${topic}) is not in the list of topics published by "initialize" (${JSON.stringify(
            this._topicNames
          )})`
        );
      }
    }

    const messages = await this._provider.getMessages(start, end, topics, extra);
    let lastTime: ?Time;
    for (const message: Message of messages) {
      if (!topics.includes(message.topic)) {
        this._warn(`message.topic (${message.topic}) was never requested (${JSON.stringify(topics)})`);
      }
      if (TimeUtil.isLessThan(message.receiveTime, start)) {
        this._warn(
          `message.receiveTime (${formatTimeRaw(message.receiveTime)}) is before start (${formatTimeRaw(start)})`
        );
      }
      if (TimeUtil.isLessThan(end, message.receiveTime)) {
        this._warn(`message.receiveTime (${formatTimeRaw(message.receiveTime)}) is after end (${formatTimeRaw(end)})`);
      }
      if (lastTime && TimeUtil.isLessThan(message.receiveTime, lastTime)) {
        this._warn(
          `message.receiveTime (${formatTimeRaw(
            message.receiveTime
          )}) is before previous message receiveTime (${formatTimeRaw(lastTime)}) -- messages are not sorted by time`
        );
      }
      lastTime = message.receiveTime;
    }
    return messages;
  }

  async close(): Promise<void> {
    if (!this._initializationResult) {
      this._warn("close was called before initialize finished");
    }
    if (this._closed) {
      this._warn("close was called twice");
    }
    this._closed = true;
    return this._provider.close();
  }

  _warn(message: string) {
    const prefixedMessage = `ApiCheckerDataProvider(${this._name}): ${message}`;
    sendNotification("Internal data provider assertion failed", prefixedMessage, "app", "warn");

    if (process.env.NODE_ENV !== "production") {
      // In tests and local development, also throw a hard message so we'll be more
      // likely to notice it / fail CI.
      throw Error(`ApiCheckerDataProvider assertion failed: ${prefixedMessage}`);
    }
  }
}
