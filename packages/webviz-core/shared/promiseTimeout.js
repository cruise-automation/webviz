// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

function promiseTimeout<T>(promise: Promise<T>, ms: number = 30000, reason: string = "unknown reason"): Promise<T> {
  return Promise.race([
    promise,
    new Promise((resolve, reject) =>
      setTimeout(() => reject(new Error(`Promise timed out after ${ms}ms: ${reason} `)), ms)
    ),
  ]);
}

export default promiseTimeout;
