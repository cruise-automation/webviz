// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

import { type DataProvider, type InitializationResult, type DataProviderMessage } from "./types";
import RpcDataProvider from "webviz-core/src/dataProviders/RpcDataProvider";
import type { DataProviderDescriptor, ExtensionPoint } from "webviz-core/src/dataProviders/types";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import Rpc from "webviz-core/src/util/Rpc";

// Wraps the underlying DataProviderDescriptor tree in a Web Worker, therefore allowing
// `getMessages` calls to get resolved in parallel to the main thread.
export default class WorkerDataProvider implements DataProvider {
  _worker: Worker;
  _provider: RpcDataProvider;
  _child: DataProviderDescriptor;

  constructor(args: any, children: DataProviderDescriptor[]) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to WorkerDataProvider: ${children.length}`);
    }
    this._child = children[0];
  }

  initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const WorkerDataProviderWorker = getGlobalHooks().getWorkerDataProviderWorker();
    this._worker = new WorkerDataProviderWorker();
    this._provider = new RpcDataProvider(new Rpc(this._worker), [this._child]);
    return this._provider.initialize(extensionPoint);
  }

  getMessages(start: Time, end: Time, topics: string[]): Promise<DataProviderMessage[]> {
    return this._provider.getMessages(start, end, topics);
  }

  async close(): Promise<void> {
    await this._provider.close();
    this._worker.terminate();
  }
}
