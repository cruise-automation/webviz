// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type Rpc from "webviz-core/src/util/Rpc";

class FakeRpc {
  proxiedWorker: FakeRpc;
  handlers: { [string]: (any) => any } = {};

  async send<TResult>(topic: string, data: any, _transfer?: any[]): Promise<TResult> {
    return this.proxiedWorker.handlers[topic](data);
  }

  async receive<T, TOut>(topic: string, handler: (T) => TOut) {
    if (this.handlers[topic]) {
      throw new Error(`Cannot call receive twice for topic: ${topic}`);
    }
    this.handlers[topic] = handler;
  }
}

export function getFakeRpcs() {
  const workerRpc = new FakeRpc();
  const mainThreadRpc = new FakeRpc();
  workerRpc.proxiedWorker = mainThreadRpc;
  mainThreadRpc.proxiedWorker = workerRpc;
  return { workerRpc, mainThreadRpc };
}

export type RpcLike = Rpc | FakeRpc;
