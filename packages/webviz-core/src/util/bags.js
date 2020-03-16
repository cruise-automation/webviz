// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { uniqWith } from "lodash";
import Bag, { TimeUtil } from "rosbag";

export function getBagChunksOverlapCount(chunkInfos: typeof Bag.prototype.chunkInfos) {
  if (!chunkInfos) {
    return 0;
  }
  const uniq = uniqWith(chunkInfos, (left, right) => {
    return TimeUtil.compare(left.startTime, right.endTime) < 0 && TimeUtil.compare(left.endTime, right.startTime) > 0;
  });
  return chunkInfos.length - uniq.length;
}
