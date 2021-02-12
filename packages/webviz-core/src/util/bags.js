// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { type Time, TimeUtil } from "rosbag";

export function getBagChunksOverlapCount(chunkInfos: $ReadOnlyArray<{ startTime: Time, endTime: Time }>) {
  if (!chunkInfos) {
    return 0;
  }
  const sorted = chunkInfos.slice().sort((left, right) => TimeUtil.compare(left.startTime, right.startTime));
  let maxEndTime = { sec: -Infinity, nsec: 0 };
  let overlaps = 0;
  sorted.forEach(({ startTime, endTime }) => {
    if (TimeUtil.isLessThan(startTime, maxEndTime)) {
      overlaps += 1;
    }
    if (TimeUtil.isGreaterThan(endTime, maxEndTime)) {
      maxEndTime = endTime;
    }
  });
  return overlaps;
}
