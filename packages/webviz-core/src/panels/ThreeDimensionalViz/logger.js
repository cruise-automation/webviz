// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { throttle } from "lodash";

const DELAY = 1000;

const warn = throttle((...args: any[]) => console.warn(...args), DELAY);
const error = throttle((...args: any[]) => console.error(...args), DELAY);
const info = throttle((...args: any[]) => console.info(...args), DELAY);
const debug = throttle((...args: any[]) => console.log(...args), DELAY);

export default {
  debug,
  info,
  warn,
  error,
};
