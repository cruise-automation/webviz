// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export function getNodeEnv() {
  return process && process.env && process.env.NODE_ENV;
}

/* eslint-disable no-undef */
export const inWebWorker = () =>
  global.postMessage && typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
