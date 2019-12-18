// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import fuzzyFilter from "./fuzzyFilter";

describe("fuzzyFilter", () => {
  it("filters correctly", () => {
    expect(fuzzyFilter(["abc", "def"], "a")).toEqual(["abc"]);
    expect(fuzzyFilter(["abc", "def"], "e")).toEqual(["def"]);
    expect(fuzzyFilter(["abc", "def"], "aa")).toEqual([]);
    expect(fuzzyFilter(["abc", "def"], "z")).toEqual([]);
  });
  it("sorts better matches first", () => {
    expect(fuzzyFilter(["abbc", "abc"], "abc")).toEqual(["abc", "abbc"]);
    expect(fuzzyFilter(["abb", "ab"], "ab")).toEqual(["ab", "abb"]);
  });
  it("allows disabling sorting", () => {
    expect(fuzzyFilter(["abbc", "abc"], "abc", (x) => x, false)).toEqual(["abbc", "abc"]);
    expect(fuzzyFilter(["abb", "ab"], "ab", (x) => x, false)).toEqual(["abb", "ab"]);
  });
  it("ignores punctuation and capitalization", () => {
    expect(fuzzyFilter(["ab/cDE"], "a-b_Cde")).toEqual(["ab/cDE"]);
  });
  it("supports custom objects", () => {
    expect(fuzzyFilter([{ x: "abc" }, { x: "def" }], "a", ({ x }) => x)).toEqual([{ x: "abc" }]);
  });
});
