// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { parsePosition } from "./PositionControl";

describe("parsePosition", () => {
  it("parses numbers correctly", () => {
    expect(parsePosition("0\n0")).toEqual([0, 0, 0]);
    expect(parsePosition("0\n1")).toEqual([0, 1, 0]);
    expect(parsePosition("1111.111\n2222.222")).toEqual([1111.111, 2222.222, 0]);
    expect(parsePosition("-1111.111\n-2222.222")).toEqual([-1111.111, -2222.222, 0]);
  });
  it("parses arrays", () => {
    expect(parsePosition("[-1.1,-2.1]")).toEqual([-1.1, -2.1, 0]);
    expect(parsePosition("   [ -1 , -0 ]  ")).toEqual([-1, -0, 0]);
  });
  it("parses objects", () => {
    expect(parsePosition("{x:1,y:2}")).toEqual([1, 2, 0]);
    expect(
      parsePosition(`{
        x: 1,
        y: 2,
        z: 3,
      }`)
    ).toEqual([1, 2, 0]);
  });
});
