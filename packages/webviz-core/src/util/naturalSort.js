// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import natsort from "natsort";

const sortFn = natsort({ insensitive: true });
export default function naturalSort(key?: string) {
  return key ? (a: any, b: any) => sortFn(a[key], b[key]) : sortFn;
}
