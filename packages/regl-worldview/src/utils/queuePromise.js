// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

type QueuedFn = ((...args: Array<any>) => void) & { currentPromise: ?Promise<any> };

// Wait for the previous promise to resolve before starting the next call to the function.
export default function queuePromise(fn: (...args: Array<any>) => Promise<any>): QueuedFn {
  // Whether we are currently waiting for a promise returned by `fn` to resolve.
  let calling = false;
  // Whether another call to the function was made while a call was in progress.
  let nextCallsArguments = [];

  function queuedFn(...args) {
    if (calling) {
      nextCallsArguments.push(args);
    } else {
      start(...args);
    }
  }

  function start(...args) {
    calling = true;

    queuedFn.currentPromise = fn(...args).finally(() => {
      calling = false;
      queuedFn.currentPromise = undefined;
      if (nextCallsArguments.length) {
        start(...nextCallsArguments.shift());
      }
    });
  }

  return queuedFn;
}
