// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { findNearestTransformElementInBlocks } from "./useTransformsNear";
import { wrapObjects } from "webviz-core/src/test/datatypes";

const makeTransform = (xAndSec) => ({
  header: { seq: 0, stamp: { sec: xAndSec, nsec: 0 }, frame_id: "f" },
  child_frame_id: "c",
  transform: { translation: { x: xAndSec, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 0 } },
});

const makeTransformElement = (x) => ({
  childFrame: "c",
  parentFrame: "f",
  pose: { position: { x, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 0 } },
});

describe("findNearestTransformElementInBlocks", () => {
  describe("works around single-element blocks", () => {
    const blocks = [[makeTransform(10)]].map(wrapObjects);
    expect(findNearestTransformElementInBlocks(blocks, 9)).toEqual(makeTransformElement(10));
    expect(findNearestTransformElementInBlocks(blocks, 10)).toEqual(makeTransformElement(10));
    expect(findNearestTransformElementInBlocks(blocks, 11)).toEqual(makeTransformElement(10));
  });

  describe("more complex examples", () => {
    const blocks = [
      [makeTransform(1), makeTransform(2)],
      [makeTransform(5), makeTransform(6)],
      [makeTransform(9), makeTransform(10)],
    ].map(wrapObjects);
    expect(findNearestTransformElementInBlocks(blocks, 0)).toEqual(makeTransformElement(1));
    expect(findNearestTransformElementInBlocks(blocks, 1)).toEqual(makeTransformElement(1));
    expect(findNearestTransformElementInBlocks(blocks, 2)).toEqual(makeTransformElement(2));
    expect(findNearestTransformElementInBlocks(blocks, 3)).toEqual(makeTransformElement(2));
    expect(findNearestTransformElementInBlocks(blocks, 4)).toEqual(makeTransformElement(5));
    expect(findNearestTransformElementInBlocks(blocks, 5)).toEqual(makeTransformElement(5));
    expect(findNearestTransformElementInBlocks(blocks, 6)).toEqual(makeTransformElement(6));
    expect(findNearestTransformElementInBlocks(blocks, 7)).toEqual(makeTransformElement(6));
    expect(findNearestTransformElementInBlocks(blocks, 8)).toEqual(makeTransformElement(9));
    expect(findNearestTransformElementInBlocks(blocks, 9)).toEqual(makeTransformElement(9));
    expect(findNearestTransformElementInBlocks(blocks, 10)).toEqual(makeTransformElement(10));
    expect(findNearestTransformElementInBlocks(blocks, 11)).toEqual(makeTransformElement(10));
  });
});
