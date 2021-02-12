// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { complement, intersect, isBefore, isDuring, isMeeting, isOverlappingSimple, simplify } from "intervals-fn";

export type Range = {| start: number /* inclusive */, end: number /* exclusive */ |};

export function isRangeCoveredByRanges(queryRange: Range, nonOverlappingMergedAndSortedRanges: Range[]) {
  for (const range of nonOverlappingMergedAndSortedRanges) {
    if (isBefore(queryRange, range)) {
      return false;
    }
    if (isDuring(queryRange, range)) {
      return true;
    }
  }
  return false;
}

export function deepIntersect(arraysOfRanges: Range[][]): Range[] {
  let result = arraysOfRanges[0] || [];
  for (const arrayOfRanges: Range[] of arraysOfRanges.slice(1)) {
    result = intersect(result, arrayOfRanges);
  }
  return simplify(result);
}

// Get the ranges in `bounds` that are NOT covered by `ranges`.
export function missingRanges(bounds: Range, ranges: Range[]) {
  // `complement` works in unexpected ways when `ranges` has a range that exceeds `bounds`,
  // so we first clip `ranges` to `bounds`.
  return complement(bounds, intersect([bounds], ranges));
}

// Given a list of unsorted, non-overlapping ranges, and a new range, produce another such list,
// with the new range in the first position, with any ranges that overlapped the new range merged
// into it.
export function mergeNewRangeIntoUnsortedNonOverlappingList(newRange: Range, unsortedNonOverlappingRanges: Range[]) {
  const newRanges = [];
  for (const range of unsortedNonOverlappingRanges) {
    if (isOverlappingSimple(newRange, range) || isMeeting(newRange, range)) {
      newRange = { start: Math.min(range.start, newRange.start), end: Math.max(range.end, newRange.end) };
    } else {
      newRanges.push(range);
    }
  }
  return [newRange, ...newRanges];
}
