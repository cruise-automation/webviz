// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import overwriteFetch from "./overwriteFetch";
import Rpc from "./Rpc";
import sendNotification, {
  setNotificationHandler,
  type DetailsType,
  type NotificationType,
} from "webviz-core/src/util/sendNotification";
import type { NotificationSeverity } from "webviz-core/src/util/sendNotification";

// We frequently want to propagate errors to the main thread so that they can be displayed to the user.
// This function should be called inside the worker; it sets up sending a message to the parent thread when
// sendNotification is called.
export function setupSendReportNotificationHandler(rpc: Rpc) {
  setNotificationHandler(
    (message: string, details: DetailsType, type: NotificationType, severity: NotificationSeverity) => {
      if (!(details instanceof Error || typeof details === "string")) {
        console.warn("Invalid Error type");
        details = JSON.stringify(details) || "<<unknown error>>";
      }
      rpc.send("sendNotification", {
        message,
        details: details instanceof Error ? details.toString() : details,
        type,
        severity,
      });
    }
  );
}

// This function should be called inside the parent thread; it sets up receiving a message from the worker thread and
// calling sendNotification.
export function setupReceiveReportErrorHandler(rpc: Rpc) {
  rpc.receive("sendNotification", ({ message, details, type, severity }) => {
    sendNotification(message, details, type, severity);
  });
}

export function setupWorker(rpc: Rpc) {
  if (process.env.NODE_ENV !== "test") {
    setupSendReportNotificationHandler(rpc);
    overwriteFetch();
  }
}
