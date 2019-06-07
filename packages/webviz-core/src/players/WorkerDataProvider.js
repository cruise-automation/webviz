// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

import { type ChainableDataProvider, type InitializationResult, type MessageLike } from "./types";
import WorkerDataProviderWorker from "./WorkerDataProvider.worker"; // eslint-disable-line
import RpcDataProvider from "webviz-core/src/players/RpcDataProvider";
import type { ChainableDataProviderDescriptor, ExtensionPoint } from "webviz-core/src/players/types";
import Rpc from "webviz-core/src/util/Rpc";

export default class WorkerDataProvider implements ChainableDataProvider {
  _worker: Worker;
  _provider: RpcDataProvider;
  _child: ChainableDataProviderDescriptor;

  constructor(args: Object, children: ChainableDataProviderDescriptor[]) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to WorkerDataProvider: ${children.length}`);
    }
    this._child = children[0];
  }

  initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    // $FlowFixMe - flow doesn't understand webpack imports this as a WebWorker constructor
    this._worker = new WorkerDataProviderWorker();
    this._provider = new RpcDataProvider(new Rpc(this._worker), this._child);
    return this._provider.initialize(extensionPoint);
  }

  getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]> {
    return this._provider.getMessages(start, end, topics);
  }

  async close(): Promise<void> {
    await this._provider.close();
    this._worker.terminate();
  }
}
