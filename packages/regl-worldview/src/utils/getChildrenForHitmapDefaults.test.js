// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { MouseEventObject } from "../types";
import { intToRGB } from "./commandUtils";
import { nonInstancedGetChildrenForHitmap, createInstancedGetChildrenForHitmap } from "./getChildrenForHitmapDefaults";

function fillArray(length: number) {
  return new Array(length).fill(null).map(() => []);
}

function toExcludedObjects(objects: Object[], instanceIndicies?: Array<?number>): MouseEventObject[] {
  return objects.map((object, index) => ({
    object,
    instanceIndex: instanceIndicies ? instanceIndicies[index] : undefined,
  }));
}

describe("getChildrenForHitmapDefaults", () => {
  let nextId;
  let assignNextColors;

  beforeEach(() => {
    nextId = 1;
    assignNextColors = jest.fn((object, count) => {
      const idArray = new Array(count).fill(null).map((_, index) => intToRGB(index + nextId));
      nextId += count;
      return idArray;
    });
  });

  describe("nonInstancedGetChildrenForHitmap", () => {
    it("handles single objects correctly", () => {
      const object = { some: "garbage", points: [[], []], colors: [[], []] };
      const hitmapProps = nonInstancedGetChildrenForHitmap(object, assignNextColors, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: [[], []],
        color: intToRGB(1),
        colors: [intToRGB(1), intToRGB(1)],
      });
      expect(assignNextColors).toHaveBeenCalledWith(object, 1);
    });

    it("filters already seen single objects correctly", () => {
      const object = { some: "garbage", points: [[], []], colors: [[], []] };
      const hitmapProps = nonInstancedGetChildrenForHitmap(object, assignNextColors, toExcludedObjects([object]));
      expect(hitmapProps).toEqual(null);
      expect(assignNextColors).not.toHaveBeenCalled();
    });

    it("handles single objects without points correctly", () => {
      const object = { some: "garbage", color: [] };
      const hitmapProps = nonInstancedGetChildrenForHitmap(object, assignNextColors, []);
      expect(hitmapProps).toEqual({ some: "garbage", color: intToRGB(1) });
      expect(assignNextColors).toHaveBeenCalledWith(object, 1);
    });

    it("handles arrays correctly", () => {
      const objects = [{ some: "garbage", color: [] }, { some: "other_garbage", color: [] }];
      const hitmapProps = nonInstancedGetChildrenForHitmap(objects, assignNextColors, []);
      expect(hitmapProps).toEqual([
        {
          some: "garbage",
          color: intToRGB(1),
        },
        {
          some: "other_garbage",
          color: intToRGB(2),
        },
      ]);
      expect(assignNextColors).toHaveBeenCalledTimes(2);
      expect(assignNextColors).toHaveBeenCalledWith(objects[0], 1);
      expect(assignNextColors).toHaveBeenCalledWith(objects[1], 1);
    });

    it("filters already seen array members correctly", () => {
      const objects = [{ some: "garbage", color: [] }, { some: "other_garbage", color: [] }];
      const hitmapProps = nonInstancedGetChildrenForHitmap(objects, assignNextColors, toExcludedObjects([objects[0]]));
      expect(hitmapProps).toEqual([
        {
          some: "other_garbage",
          color: intToRGB(1),
        },
      ]);
      expect(assignNextColors).toHaveBeenCalledTimes(1);
    });

    it("filters all array members correctly", () => {
      const objects = [{ some: "garbage", color: [] }, { some: "other_garbage", color: [] }];
      const hitmapProps = nonInstancedGetChildrenForHitmap(objects, assignNextColors, toExcludedObjects(objects));
      expect(hitmapProps).toEqual([]);
      expect(assignNextColors).toHaveBeenCalledTimes(0);
    });
  });

  describe("createInstancedGetChildrenForHitmap", () => {
    it("handles single objects correctly", () => {
      const object = { some: "garbage", points: fillArray(6), colors: fillArray(6) };
      const hitmapProps = createInstancedGetChildrenForHitmap(2)(object, assignNextColors, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: fillArray(6),
        colors: [intToRGB(1), intToRGB(1), intToRGB(2), intToRGB(2), intToRGB(3), intToRGB(3)],
      });
      expect(assignNextColors).toHaveBeenCalledTimes(1);
      expect(assignNextColors).toHaveBeenCalledWith(object, 3);
    });

    it("handles single objects without points correctly", () => {
      const object = { some: "garbage", color: [] };
      const hitmapProps = createInstancedGetChildrenForHitmap(2)(object, assignNextColors, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        color: intToRGB(1),
      });
      expect(assignNextColors).toHaveBeenCalledTimes(1);
      expect(assignNextColors).toHaveBeenCalledWith(object, 1);
    });

    it("handles objects with an empty point array", () => {
      const object = { some: "garbage", points: [] };
      const hitmapProps = createInstancedGetChildrenForHitmap(2)(object, assignNextColors, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: [],
        color: intToRGB(1),
      });
      expect(assignNextColors).toHaveBeenCalledTimes(1);
      expect(assignNextColors).toHaveBeenCalledWith(object, 1);
    });

    it("handles single point counts", () => {
      const object = { some: "garbage", points: fillArray(3), colors: fillArray(3) };
      const hitmapProps = createInstancedGetChildrenForHitmap(1)(object, assignNextColors, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: fillArray(3),
        colors: [intToRGB(1), intToRGB(2), intToRGB(3)],
      });
      expect(assignNextColors).toHaveBeenCalledTimes(1);
      expect(assignNextColors).toHaveBeenCalledWith(object, 3);
    });

    it("handles offset point counts", () => {
      const object = { some: "garbage", points: fillArray(4), colors: fillArray(4) };
      const hitmapProps = createInstancedGetChildrenForHitmap(3)(object, assignNextColors, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: fillArray(4),
        colors: [intToRGB(1), intToRGB(1), intToRGB(1), intToRGB(2)],
      });
      expect(assignNextColors).toHaveBeenCalledTimes(1);
      expect(assignNextColors).toHaveBeenCalledWith(object, 2);
    });

    it("filters instances correctly", () => {
      const object = { some: "garbage", points: fillArray(6), colors: fillArray(6) };
      const hitmapProps = createInstancedGetChildrenForHitmap(2)(
        object,
        assignNextColors,
        toExcludedObjects([object], [1])
      );
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: fillArray(4),
        colors: [intToRGB(1), intToRGB(1), intToRGB(3), intToRGB(3)],
      });
      expect(assignNextColors).toHaveBeenCalledTimes(1);
      expect(assignNextColors).toHaveBeenCalledWith(object, 3);
    });

    it("filters objects without points correctly", () => {
      const object = { some: "garbage" };
      const hitmapProps = createInstancedGetChildrenForHitmap(1)(
        object,
        assignNextColors,
        toExcludedObjects([object], [0])
      );
      expect(hitmapProps).toEqual(null);
    });

    it("handles arrays correctly", () => {
      const objects = [
        { some: "garbage", points: fillArray(6), colors: fillArray(6) },
        { some: "other_garbage", points: fillArray(8), colors: fillArray(8) },
      ];
      const hitmapProps = createInstancedGetChildrenForHitmap(2)(objects, assignNextColors, []);
      expect(hitmapProps).toEqual([
        {
          some: "garbage",
          points: fillArray(6),
          colors: [intToRGB(1), intToRGB(1), intToRGB(2), intToRGB(2), intToRGB(3), intToRGB(3)],
        },
        {
          some: "other_garbage",
          points: fillArray(8),
          colors: [
            intToRGB(4),
            intToRGB(4),
            intToRGB(5),
            intToRGB(5),
            intToRGB(6),
            intToRGB(6),
            intToRGB(7),
            intToRGB(7),
          ],
        },
      ]);
      expect(assignNextColors).toHaveBeenCalledTimes(2);
      expect(assignNextColors).toHaveBeenCalledWith(objects[0], 3);
      expect(assignNextColors).toHaveBeenCalledWith(objects[1], 4);
    });
  });
});
