//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { keyBy, groupBy, mapValues } from "./lodash";

const testData: { foo: string }[] = [{ foo: "1" }, { foo: "2" }, { foo: "3" }, { foo: "1" }];

describe("keyBy", () => {
  it("retuns an object keyed by the given function", () => {
    expect(keyBy(testData, ({ foo }) => foo)).toEqual({
      1: { foo: "1" },
      2: { foo: "2" },
      3: { foo: "3" },
    });
  });
});

describe("groupBy", () => {
  it("returns an object of arrays keyed by the given function", () => {
    expect(groupBy(testData, ({ foo }) => foo)).toEqual({
      1: [{ foo: "1" }, { foo: "1" }],
      2: [{ foo: "2" }],
      3: [{ foo: "3" }],
    });
  });
});

describe("mapValues", () => {
  it("maps values", () => {
    expect(mapValues({ foo: 1, bar: 2 }, (num: number) => num + 1)).toEqual({ foo: 2, bar: 3 });
  });
});
