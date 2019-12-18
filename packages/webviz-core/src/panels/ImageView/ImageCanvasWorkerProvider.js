// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ImageCanvasWorker from "./ImageCanvas.worker";
import Rpc from "webviz-core/src/util/Rpc";
import { setupReceiveReportErrorHandler } from "webviz-core/src/util/RpcUtils";

let rpc = null;
let worker = null;
let listenerIds: string[] = [];

export function registerImageCanvasWorkerListener(id: string) {
  if (!rpc) {
    // $FlowFixMe flow does not like workers
    worker = new ImageCanvasWorker();
    rpc = new Rpc(worker);
    setupReceiveReportErrorHandler(rpc);
  }
  listenerIds.push(id);
  return rpc;
}

export function unregisterImageCanvasWorkerListener(id: string) {
  if (rpc && listenerIds.includes(id)) {
    listenerIds = listenerIds.filter((_id) => _id !== id);
    if (listenerIds.length === 0) {
      rpc = null;
      // $FlowFixMe Flow doesn't know how to handle web workers.
      worker.terminate();
      worker = null;
    }
  }
}

export function testing_reset() {
  rpc = null;
  worker = null;
  listenerIds = [];
}

export function testing_GetInternalState() {
  return {
    rpc,
    worker,
    listenerIds,
  };
}
