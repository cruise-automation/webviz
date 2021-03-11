// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Rpc from "./Rpc";
import { logEventForRpc } from "webviz-core/src/util/logEvent";
import sendNotification from "webviz-core/src/util/sendNotification";

// This function should be called inside the parent thread; it sets up receiving a message from the worker thread and
// calling sendNotification.
export function setupReceiveReportErrorHandler(rpc: Rpc) {
  rpc.receive("sendNotification", ({ message, details, type, severity }) => {
    sendNotification(message, details, type, severity);
  });
}

export function setupReceiveLogEventHandler(rpc: Rpc) {
  rpc.receive("logEvent", ({ type, params }) => {
    logEventForRpc(type, params);
  });
}

export function setupMainThreadRpc(rpc: Rpc) {
  setupReceiveReportErrorHandler(rpc);
  setupReceiveLogEventHandler(rpc);
}
