// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { registerNode, processMessage } from "webviz-core/src/players/UserNodePlayer/nodeRuntimeWorker/registry";
import Rpc from "webviz-core/src/util/Rpc";

// eslint-disable-next-line no-undef
if (!global.postMessage || typeof WorkerGlobalScope === "undefined" || !(self instanceof WorkerGlobalScope)) {
  throw new Error("Not in a WebWorker.");
}

const rpc = new Rpc(global);
rpc.receive("registerNode", registerNode);
rpc.receive("processMessage", processMessage);
