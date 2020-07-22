// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { inBounds } from "./zoomAndPanHelpers";

const getBounds = (minAlongAxis, maxAlongAxis) => ({
  id: "foo",
  min: 10,
  max: 20,
  minAlongAxis,
  maxAlongAxis,
  axes: "xAxes",
});

describe("inBounds", () => {
  it("returns false if the bounds are not present", () => {
    expect(inBounds(10, undefined)).toBe(false);
  });

  it("returns true when the value is equal to one of the bounds", () => {
    expect(inBounds(10, getBounds(10, 20))).toBe(true);
    expect(inBounds(10, getBounds(20, 10))).toBe(true);
  });

  it("returns true when the value is within the bounds", () => {
    expect(inBounds(15, getBounds(10, 20))).toBe(true);
    expect(inBounds(15, getBounds(20, 10))).toBe(true);
  });

  it("returns false when the value is outside the bounds", () => {
    expect(inBounds(25, getBounds(10, 20))).toBe(false);
    expect(inBounds(25, getBounds(20, 10))).toBe(false);
  });
});
