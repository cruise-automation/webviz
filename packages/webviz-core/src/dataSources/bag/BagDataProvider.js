// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { open, Time } from "rosbag";

import { type InitializationResult, type MessageLike } from "../types";
// $FlowFixMe - flow doesn't understand webpack imports this as a WebWorker constructor
import BagDataProviderWorker from "./BagDataProvider.worker"; // eslint-disable-line
import type { InitializeMessage } from "./types";
import { bagConnectionsToDatatypes, bagConnectionsToTopics } from "webviz-core/shared/bagConnectionsHelper";
import MessageReaderStore from "webviz-core/src/util/MessageReaderStore";
import Rpc from "webviz-core/src/util/Rpc";

const readers = new MessageReaderStore();

type Connection = {
  messageDefinition: string,
  md5sum: string,
  topic: string,
  type: string,
};

export class BagDataProvider {
  _rpc: Rpc;
  _bagPath: File | string;
  _connections: { [topic: string]: Connection } = {};
  _worker: ?BagDataProviderWorker;
  constructor(bagPath: File | string, rpc?: Rpc) {
    this._bagPath = bagPath;
    if (rpc) {
      this._rpc = rpc;
    } else {
      this._worker = new BagDataProviderWorker();
      this._rpc = new Rpc(this._worker);
    }
  }

  async initialize(): Promise<InitializationResult> {
    const bag = await open(this._bagPath);
    const message: InitializeMessage = {
      bagPath: this._bagPath,
    };
    await this._rpc.send("initialize", message);
    const connections = ((Object.values(bag.connections): any): Connection[]);
    const result = {
      start: bag.startTime,
      end: bag.endTime,
      topics: bagConnectionsToTopics(connections),
      datatypes: bagConnectionsToDatatypes(connections),
    };
    for (const conn of connections) {
      this._connections[conn.topic] = conn;
    }
    return result;
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]> {
    const { messages } = await this._rpc.send("getMessages", { start, end, topics });
    const result = [];
    for (const message of messages) {
      const connection = this._connections[message.topic];
      if (!connection) {
        console.warn("Could not find connection in bag for message", message);
        continue;
      }
      const { type, md5sum, messageDefinition } = connection;
      const reader = readers.get(type, md5sum, messageDefinition);
      const parsedMessage = reader.readMessage(Buffer.from(message.buffer));
      result.push({
        topic: message.topic,
        datatype: type,
        receiveTime: message.timestamp,
        message: parsedMessage,
      });
    }
    return result;
  }

  close(): Promise<void> {
    if (this._worker) {
      this._worker.terminate();
    }
    return Promise.resolve();
  }
}
