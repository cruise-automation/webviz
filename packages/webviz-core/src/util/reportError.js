// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

type ErrorHandler = (message: string, details: string | Error) => void;

let addError: ErrorHandler = (message: string, details: string | Error): void => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  console.error("Error before error display is mounted", message, details);
};

export function setErrorHandler(handler: ErrorHandler): void {
  addError = handler;
  // attach to window in dev mode for testing errors
  if (process.env.NODE_ENV !== "production") {
    window.addError = handler;
  }
}

// call this to add an error to the application nav bar error component if mounted
// if the component is not mounted, console.error is used as a fallback
export default function reportError(message: string, details: string | Error): void {
  addError(message, details);
}
