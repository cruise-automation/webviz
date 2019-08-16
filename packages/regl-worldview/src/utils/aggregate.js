// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Takes an array of [value, key] and aggregates across the keys. Results in a Map of [key, values[]], in order of the
// keys as seen in the array.
export default function aggregate<T, K>(array: Array<[T, K]>): Map<K, T[]> {
  const aggregationMap = new Map<K, T[]>();
  array.forEach(([item, key]) => {
    const existingItems = aggregationMap.get(key) || [];
    existingItems.push(item);
    if (!aggregationMap.has(key)) {
      aggregationMap.set(key, existingItems);
    }
  });
  return aggregationMap;
}
