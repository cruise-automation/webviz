// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// More efficient version of [...values].map(mapFn).filter(Boolean)
export default function filterMap<T, U>(values: Iterable<T>, mapFn: (T, number) => ?U): U[] {
  const results = [];
  let index = 0;
  for (const item of values) {
    const mappedItem = mapFn(item, index++);
    if (mappedItem) {
      results.push(mappedItem);
    }
  }
  return results;
}
