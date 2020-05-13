// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// For some handlers it's important to know if the error was due to the application malfunctioning
// (programming error, dependency being down, etc) or a user mistake (incorrect/malformed data,
// etc). We should generally prevent users from making mistakes in the first place, but sometimes
// its unavoidable to bail out with a generic error message (e.g. when dragging in a malformed
// ROS bag).
import * as Sentry from "@sentry/browser";
import { Severity } from "@sentry/types";
import type { Node } from "react";

import { AppError } from "webviz-core/src/util/errors";
import { inWebWorker } from "webviz-core/src/util/workers";

export type AlertType = "app" | "user";
export type DetailsType = string | Error | Node;
export type AlertSeverity = "error" | "warn" | "info";

type AlertHandler = (message: string, details: DetailsType, type: AlertType, severity: AlertSeverity) => void;

const defaultAlertHandler: AlertHandler = (
  message: string,
  details: DetailsType,
  type: AlertType,
  severity: AlertSeverity
): void => {
  if (!inWebWorker()) {
    const webWorkerError =
      "Web Worker has uninitialized sendNotification function; this means this error message cannot show up in the UI (so we show it here in the console instead).";
    if (process.env.NODE_ENV === "test") {
      throw new Error(webWorkerError);
    } else {
      const consoleFn = severity === "error" ? console.error : severity === "warn" ? console.warn : console.info;
      consoleFn(webWorkerError, message, details, type);
    }
    return;
  } else if (process.env.NODE_ENV === "test") {
    return;
  }
  console.error("Alert before error display is mounted", message, details, type);
};

let addAlert: AlertHandler = defaultAlertHandler;

export function setAlertHandler(handler: AlertHandler): void {
  if (addAlert !== defaultAlertHandler) {
    throw new Error("Tried to overwrite existing AlertHandler");
  }
  addAlert = handler;
  // attach to window in dev mode for testing errors
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    window.addError = handler;
  }
}

export function unsetAlertHandler() {
  if (addAlert === defaultAlertHandler) {
    throw new Error("Tried to unset AlertHandler but it was already the default");
  }
  addAlert = defaultAlertHandler;
}

export function detailsToString(details: DetailsType): string {
  if (typeof details === "string") {
    return details;
  }
  if (details instanceof Error) {
    return details.toString();
  }
  return "unable to convert details to string type";
}

// Call this to add an alert to the application nav bar error component if mounted.
// If the component is not mounted, use the console as a fallback.
export default function sendNotification(
  message: string,
  details: DetailsType,
  type: AlertType,
  severity: AlertSeverity
): void {
  // We only want to send non-user errors and warnings to Sentry
  if (type === "app") {
    const sentrySeverity = severity === "error" ? Severity.Error : severity === "warn" ? Severity.Warning : null;
    if (sentrySeverity) {
      Sentry.captureException(new AppError(details, message), sentrySeverity);
    }
  }

  addAlert(message, details, type, severity);
}

sendNotification.expectCalledDuringTest = () => {}; // Overridden in tests; added here so Flow doesn't complain.
