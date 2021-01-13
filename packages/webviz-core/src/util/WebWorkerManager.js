// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import findIndex from "lodash/findIndex";
import sortBy from "lodash/sortBy";

import Rpc from "webviz-core/src/util/Rpc";
import { setupMainThreadRpc } from "webviz-core/src/util/RpcMainThreadUtils";

// This file provides a convenient way to set up and tear down workers as needed. It will create only a single worker
// of each class, and terminate the worker when all listeners are unregistered.

type WorkerListenerState = {| rpc: Rpc, worker: any, listenerIds: string[] |};

export default class WebWorkerManager {
  _classType: any;
  _maxWorkerCount: number;
  _workerStates: (?WorkerListenerState)[];
  _allListeners: Set<string>;

  constructor(classType: any, maxWorkerCount: number) {
    this._classType = classType;
    this._maxWorkerCount = maxWorkerCount;
    this._workerStates = new Array(maxWorkerCount);
    this._allListeners = new Set();
  }

  testing_getWorkerState(id: string): ?WorkerListenerState {
    return this._workerStates.find((workerState) => workerState && workerState.listenerIds.includes(id));
  }

  registerWorkerListener(id: string): Rpc {
    if (this._allListeners.has(id)) {
      throw new Error("cannot register the same listener id twice");
    }
    this._allListeners.add(id);

    const currentWorkerCount = this._workerStates.filter(Boolean).length;
    if (currentWorkerCount < this._maxWorkerCount) {
      const worker = new this._classType();
      const rpc = new Rpc(worker);
      setupMainThreadRpc(rpc);

      const emptyIndex = findIndex(this._workerStates, (x) => !x);
      this._workerStates[emptyIndex] = { worker, rpc, listenerIds: [id] };
      return rpc;
    }
    const workerStateByListenerCount = sortBy(
      this._workerStates.filter(Boolean),
      (workerState) => workerState && workerState.listenerIds.length
    );
    const workerState = workerStateByListenerCount[0];
    workerState.listenerIds.push(id);
    return workerState.rpc;
  }

  unregisterWorkerListener(id: string) {
    if (!this._allListeners.has(id)) {
      throw new Error("Cannot find listener to unregister");
    }
    this._allListeners.delete(id);

    const workerStateIndex = findIndex(
      this._workerStates,
      (workerState) => workerState && workerState.listenerIds.includes(id)
    );
    const workerState = this._workerStates[workerStateIndex];
    if (workerStateIndex >= 0 && workerState) {
      workerState.listenerIds = workerState.listenerIds.filter((_id) => _id !== id);
      if (workerState.listenerIds.length === 0) {
        this._workerStates[workerStateIndex] = undefined;
        workerState.worker.terminate();
      }
    }
  }
}
