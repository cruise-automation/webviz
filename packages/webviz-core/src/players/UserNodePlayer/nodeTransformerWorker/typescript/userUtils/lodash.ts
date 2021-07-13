//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export function keyBy<T>(collection: T[], fn: (item: T) => string): Record<string, T> {
  const groups: Record<string, T> = {};
  for (const item of collection) {
    const key = fn(item);
    groups[key] = item;
  }
  return groups;
}

export function groupBy<T>(collection: T[], fn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of collection) {
    const key = fn(item);
    const existing = groups[key] || [];
    groups[key] = [...existing, item];
  }
  return groups;
}

export function mapValues<I, O>(obj: Record<string, I>, fn: (val: I) => O): Record<string, O> {
  const result: Record<string, O> = {};
  Object.keys(obj).forEach((key: string) => {
    result[key] = fn(obj[key]);
  });
  return result;
}
