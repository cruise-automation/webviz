// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { isBefore, isDuring } from "intervals-fn";

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
