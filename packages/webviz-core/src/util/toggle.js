// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { reject } from "lodash";

// toggles an item in an array based on reference equality
// or an optional predicate to determine if the item should be toggled in/out
// this function is pure - it always returns a new array
export default function toggle<T>(array: T[], item: T, predicate: (T) => boolean = (el) => el === item): T[] {
  const newArray = reject(array, predicate);
  if (newArray.length === array.length) {
    newArray.push(item);
  }
  return newArray;
}
