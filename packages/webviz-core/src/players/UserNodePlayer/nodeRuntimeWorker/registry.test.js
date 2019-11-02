// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { containsFuncDeclaration, stringifyFuncsInObject } from "./registry";

const someFunc = (a, b) => a + b;
const otherArgs = [1, false, "abc"];
describe("containsFuncDeclaration", () => {
  it("returns true if a single arg is a function declaration", () => {
    expect(containsFuncDeclaration([someFunc])).toEqual(true);
  });

  it("returns true if one of many args is a function declaration", () => {
    expect(containsFuncDeclaration([...otherArgs, () => {}])).toEqual(true);
  });

  it("returns true if a single arg contains a nested function declaration", () => {
    expect(containsFuncDeclaration([{ someKey: someFunc }])).toEqual(true);
  });

  it("returns true if one of many args contains a nested function declaration", () => {
    expect(containsFuncDeclaration([...otherArgs, { someKey: someFunc }])).toEqual(true);
    expect(containsFuncDeclaration([...otherArgs, { someKey: { someNestedKey: someFunc } }])).toEqual(true);
  });
});

describe("stringifyFuncsInObject", () => {
  it("stringifies just the functions in an object", () => {
    expect(stringifyFuncsInObject({ someKey: someFunc, anotherKey: someFunc })).toEqual({
      someKey: "(a, b) => a + b",
      anotherKey: "(a, b) => a + b",
    });
    expect(
      stringifyFuncsInObject({ someKey: someFunc, anotherKey: { nestedKey: someFunc, anotherNestedKey: 5 } })
    ).toEqual({
      someKey: "(a, b) => a + b",
      anotherKey: { nestedKey: "(a, b) => a + b", anotherNestedKey: 5 },
    });
    expect(
      stringifyFuncsInObject({ someKey: true, anotherKey: { nestedKey: null, anotherNestedKey: undefined } })
    ).toEqual({
      someKey: true,
      anotherKey: { nestedKey: null, anotherNestedKey: undefined },
    });
  });
});
