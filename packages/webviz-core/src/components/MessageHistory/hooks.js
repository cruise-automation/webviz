// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useRef } from "react";
import shallowequal from "shallowequal";

// Return initiallyTrue the first time, and again if any of the given deps have changed.
export function useChangeDetector(deps: any[], initiallyTrue: boolean) {
  const ref = useRef(initiallyTrue ? undefined : deps);
  const changed = !shallowequal(ref.current, deps);
  ref.current = deps;
  return changed;
}

// Continues to return the same instance as long as shallow equality is maintained.
export function useShallowMemo<T>(value: T): T {
  const ref = useRef(value);
  if (shallowequal(value, ref.current)) {
    return ref.current;
  }
  ref.current = value;
  return value;
}

function format(value: any): string {
  try {
    return JSON.stringify(value);
  } catch (err) {
    return "<unknown object>";
  }
}

// Throw an error if the given value changes between renders.
export function useMustNotChange<T>(value: T, message: string): T {
  const ref = useRef(value);
  if (value !== ref.current) {
    throw new Error(`${message}\nOld: ${format(ref.current)}\nNew: ${format(value)}`);
  }
  return value;
}

// Log a warning if the given value changes twice in a row.
export function useShouldNotChangeOften<T>(value: T, message: string): T {
  const prev = useRef(value);
  const prevPrev = useRef(value);
  if (value !== prev.current && prev.current !== prevPrev.current) {
    console.warn(message);
  }
  prevPrev.current = prev.current;
  prev.current = value;
  return value;
}
