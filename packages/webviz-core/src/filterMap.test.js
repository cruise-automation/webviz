// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import filterMap from "./filterMap";

describe("filterMap", () => {
  it("behaves like map()+filter(Boolean)", () => {
    expect(filterMap([], (x) => x)).toEqual([]);
    expect(filterMap([1, 2, 3], (x, i) => x === i + 1)).toEqual([true, true, true]);
    expect(filterMap([0, 1, 2], (x) => x)).toEqual([1, 2]);
    expect(filterMap([0, 1, 2], (x) => x - 1)).toEqual([-1, 1]);
    expect(filterMap([0, 1, 2], () => true)).toEqual([true, true, true]);
    expect(filterMap([0, 1, 2], () => 0)).toEqual([]);
    expect(filterMap([0, 1, 2], () => undefined)).toEqual([]);
    expect(filterMap([0, 1, 2], () => NaN)).toEqual([]);
    expect(filterMap([0, 1, 2], () => null)).toEqual([]);
    expect(filterMap([0, 1, 2], () => "")).toEqual([]);
    expect(filterMap([0, 1, 2], () => false)).toEqual([]);
  });
});
