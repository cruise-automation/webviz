// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { TimestampMethod } from "webviz-core/src/util/time";

export type BasePlotPath = {
  value: string,
  enabled: boolean,
};

export type PlotPath = BasePlotPath & {
  timestampMethod: TimestampMethod,
};

// A "reference line" plot path is a numeric value. It creates a horizontal line on the plot at the specified value.
export function isReferenceLinePlotPathType(path: BasePlotPath): boolean {
  return !isNaN(Number.parseFloat(path.value));
}
