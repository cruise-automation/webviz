// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable no-undef */
export const inWebWorker = () =>
  global.postMessage && typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;

// To debug shared workers, enter 'chrome://inspect/#workers' into the url bar.
export const inSharedWorker = () =>
  typeof SharedWorkerGlobalScope !== "undefined" && self instanceof SharedWorkerGlobalScope;
/* eslint-enable no-undef */

export const enforceFetchIsBlocked = <R, Args: $ReadOnlyArray<mixed>>(
  fn: (...args: Args) => R
): ((...args: Args) => Promise<R>) => {
  const canFetch =
    typeof fetch !== "undefined" &&
    fetch("data:test")
      .then(() => true)
      .catch(() => false);
  return async (...args) => {
    if (await canFetch) {
      throw new Error("Content security policy too loose.");
    }
    return fn(...args);
  };
};
