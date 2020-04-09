// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { registerNode, processMessage } from "webviz-core/src/players/UserNodePlayer/nodeRuntimeWorker/registry";
import Rpc from "webviz-core/src/util/Rpc";
import { enforceFetchIsBlocked, inSharedWorker } from "webviz-core/src/util/workers";

if (!inSharedWorker()) {
  // In Chrome, web workers currently (as of March 2020) inherit their Content Security Policy from
  // their associated page, ignoring any policy in the headers of their source file. SharedWorkers
  // use the headers from their source files, though, and we use a CSP to prohibit node playground
  // workers from making web requests (using enforceFetchIsBlocked, below.)
  // TODO(steel): Change this back to a web worker if/when Chrome changes its behavior:
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1012640
  throw new Error("Not in a SharedWorker.");
}

global.onconnect = (e) => {
  const port = e.ports[0];
  const rpc = new Rpc(port);
  // Just check fetch is blocked on registration, don't slow down message processing.
  rpc.receive("registerNode", enforceFetchIsBlocked(registerNode));
  rpc.receive("processMessage", processMessage);
  port.start();
};
