// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Rpc from "./Rpc";
import reportError, { setErrorHandler, type DetailsType, type ErrorType } from "webviz-core/src/util/reportError";

// We frequently want to propagate errors to the main thread so that they can be displayed to the user.
// This function should be called inside the worker; it sets up sending a message to the parent thread when
// reportError is called.
export function setupSendReportErrorHandler(rpc: Rpc) {
  setErrorHandler((message: string, details: DetailsType, type: ErrorType) => {
    rpc.send("reportError", {
      message,
      details: details instanceof Error ? details.toString() : JSON.stringify(details),
      type,
    });
  });
}

// This function should be called inside the parent thread; it sets up receiving a message from the worker thread and
// calling reportError.
export function setupReceiveReportErrorHandler(rpc: Rpc) {
  rpc.receive("reportError", ({ message, details, type }) => {
    reportError(message, details, type);
  });
}
