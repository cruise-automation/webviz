// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getBagChunksOverlapCount } from "./bags";
import { fromSec } from "webviz-core/src/util/time";

function* getPermutations<T>(values: T[]): Iterator<T[]> {
  if (values.length < 2) {
    yield values;
    return;
  }
  for (let i = 0; i < values.length; ++i) {
    const element = values[i];
    const rest = [...values.slice(0, i), ...values.slice(i + 1)];
    for (const restPermutation of getPermutations(rest)) {
      yield [element, ...restPermutation];
    }
  }
}

// Just to make sure that it works
describe("permutations", () => {
  it("returns every order of the input elements", () => {
    const permutations = [...getPermutations<number>([1, 2, 3])].map((numbers: number[]) => numbers.join(","));
    expect(new Set(permutations)).toEqual(new Set(["1,2,3", "1,3,2", "2,1,3", "2,3,1", "3,1,2", "3,2,1"]));
  });
});

const check = (elements, expectedSize) => {
  for (const permutation of getPermutations(elements)) {
    expect(getBagChunksOverlapCount(permutation)).toBe(expectedSize);
  }
};

const times = (input: [number, number][]) =>
  input.map(([start, end]) => ({
    startTime: fromSec(start),
    endTime: fromSec(end),
  }));

describe("getBagChunksOverlapCount", () => {
  it("returns zero when chunks do not overlap", () => {
    const elements = times([[1, 2], [2, 3], [3.5, 5], [6, 6], [6, 6], [6.5, 7]]);
    check(elements, 0);
  });

  it("returns one when two elements overlap", () => {
    const elements = times([[0, 1], [1, 2], [1.9, 2.1], [3, 4]]);
    check(elements, 1);
  });

  it("returns two when two separate pairs of elements overlap", () => {
    const elements = times([[0, 1], [0.5, 1.5], [4, 5], [6, 7], [6.5, 7.5]]);
    check(elements, 2);
  });

  it("returns the number of elements minus one when they all overlap", () => {
    const elements = times([[0, 1], [0, 1], [0.5, 1.5], [0.9, 1.9]]);
    check(elements, 3);
  });
});
