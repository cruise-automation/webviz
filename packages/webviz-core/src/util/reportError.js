// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// For some handlers it's important to know if the error was due to the application malfunctioning
// (programming error, dependency being down, etc) or a user mistake (incorrect/malformed data,
// etc). We should generally prevent users from making mistakes in the first place, but sometimes
// its unavoidable to bail out with a generic error message (e.g. when dragging in a malformed
// ROS bag).
export type ErrorType = "app" | "user";

type ErrorHandler = (message: string, details: string | Error, type: ErrorType) => void;

const defaultErrorHandler: ErrorHandler = (message: string, details: string | Error, type: ErrorType): void => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  console.error("Error before error display is mounted", message, details, type);
};

let addError: ErrorHandler = defaultErrorHandler;

export function setErrorHandler(handler: ErrorHandler): void {
  if (addError !== defaultErrorHandler) {
    throw new Error("Tried to overwrite existing ErrorHandler");
  }
  addError = handler;
  // attach to window in dev mode for testing errors
  if (process.env.NODE_ENV !== "production") {
    window.addError = handler;
  }
}

// Call this to add an error to the application nav bar error component if mounted
// if the component is not mounted, console.error is used as a fallback.
//
export default function reportError(message: string, details: string | Error, type: ErrorType): void {
  addError(message, details, type);
}
