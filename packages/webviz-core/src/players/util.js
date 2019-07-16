// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Progress } from "webviz-core/src/types/players";
import { deepIntersect } from "webviz-core/src/util/ranges";

export const intersectProgress = (progresses: Progress[]): Progress => {
  if (progresses.length === 0) {
    return { fullyLoadedFractionRanges: [] };
  }

  return {
    fullyLoadedFractionRanges: deepIntersect(progresses.map((p) => p.fullyLoadedFractionRanges).filter(Boolean)),
  };
};

export const emptyProgress = () => {
  return {
    fullyLoadedFractionRanges: [{ start: 0, end: 0 }],
  };
};

export const fullyLoadedProgress = () => {
  return {
    fullyLoadedFractionRanges: [{ start: 0, end: 1 }],
  };
};
