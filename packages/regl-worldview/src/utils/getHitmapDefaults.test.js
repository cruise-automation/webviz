// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { MouseEventObject } from "../types";
import { intToRGB } from "./commandUtils";
import { nonInstancedGetHitmap, createInstancedGetHitmap } from "./getHitmapDefaults";

function fillArray(length: number) {
  return new Array(length).fill(null).map(() => []);
}

function toSeenObjects(objects: Object[], instanceIndicies?: Array<?number>): MouseEventObject[] {
  return objects.map((object, index) => ({
    object,
    instanceIndex: instanceIndicies ? instanceIndicies[index] : undefined,
  }));
}

describe("getHitmapDefaults", () => {
  let nextId;
  let assignNextIds;

  beforeEach(() => {
    nextId = 1;
    assignNextIds = jest.fn((obj) => {
      if (obj.type === "single") {
        const currentId = nextId;
        nextId++;
        return [currentId];
      }
      const { count } = obj;
      const idArray = new Array(count).fill(null).map((_, index) => index + nextId);
      nextId += count;
      return idArray;
    });
  });

  describe("nonInstancedGetHitmap", () => {
    it("handles single objects correctly", () => {
      const object = { some: "garbage", points: [[], []], colors: [[], []] };
      const hitmapProps = nonInstancedGetHitmap(object, assignNextIds, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: [[], []],
        color: intToRGB(1),
        colors: [intToRGB(1), intToRGB(1)],
      });
      expect(assignNextIds).toHaveBeenCalledWith({ type: "single", callbackObject: object });
    });

    it("filters already seen single objects correctly", () => {
      const object = { some: "garbage", points: [[], []], colors: [[], []] };
      const hitmapProps = nonInstancedGetHitmap(object, assignNextIds, toSeenObjects([object]));
      expect(hitmapProps).toEqual(undefined);
      expect(assignNextIds).not.toHaveBeenCalled();
    });

    it("handles single objects without points correctly", () => {
      const object = { some: "garbage", color: [] };
      const hitmapProps = nonInstancedGetHitmap(object, assignNextIds, []);
      expect(hitmapProps).toEqual({ some: "garbage", color: intToRGB(1) });
      expect(assignNextIds).toHaveBeenCalledWith({ type: "single", callbackObject: object });
    });

    it("handles arrays correctly", () => {
      const objects = [{ some: "garbage", color: [] }, { some: "other_garbage", color: [] }];
      const hitmapProps = nonInstancedGetHitmap(objects, assignNextIds, []);
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
      expect(assignNextIds).toHaveBeenCalledTimes(2);
      expect(assignNextIds).toHaveBeenCalledWith({ type: "single", callbackObject: objects[0] });
      expect(assignNextIds).toHaveBeenCalledWith({ type: "single", callbackObject: objects[1] });
    });

    it("filters already seen array members correctly", () => {
      const objects = [{ some: "garbage", color: [] }, { some: "other_garbage", color: [] }];
      const hitmapProps = nonInstancedGetHitmap(objects, assignNextIds, toSeenObjects([objects[0]]));
      expect(hitmapProps).toEqual([
        {
          some: "other_garbage",
          color: intToRGB(1),
        },
      ]);
      expect(assignNextIds).toHaveBeenCalledTimes(1);
    });

    it("filters all array members correctly", () => {
      const objects = [{ some: "garbage", color: [] }, { some: "other_garbage", color: [] }];
      const hitmapProps = nonInstancedGetHitmap(objects, assignNextIds, toSeenObjects(objects));
      expect(hitmapProps).toEqual([]);
      expect(assignNextIds).toHaveBeenCalledTimes(0);
    });
  });

  describe("createInstancedGetHitmap", () => {
    it("handles single objects correctly", () => {
      const object = { some: "garbage", points: fillArray(6), colors: fillArray(6) };
      const hitmapProps = createInstancedGetHitmap(2)(object, assignNextIds, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: fillArray(6),
        colors: [intToRGB(1), intToRGB(1), intToRGB(2), intToRGB(2), intToRGB(3), intToRGB(3)],
      });
      expect(assignNextIds).toHaveBeenCalledTimes(1);
      expect(assignNextIds).toHaveBeenCalledWith({ type: "instanced", callbackObject: object, count: 3 });
    });

    it("handles single objects without points correctly", () => {
      const object = { some: "garbage", color: [] };
      const hitmapProps = createInstancedGetHitmap(2)(object, assignNextIds, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        color: intToRGB(1),
      });
      expect(assignNextIds).toHaveBeenCalledTimes(1);
      expect(assignNextIds).toHaveBeenCalledWith({ type: "instanced", callbackObject: object, count: 1 });
    });

    it("handles objects with an empty point array", () => {
      const object = { some: "garbage", points: [] };
      const hitmapProps = createInstancedGetHitmap(2)(object, assignNextIds, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: [],
        color: intToRGB(1),
      });
      expect(assignNextIds).toHaveBeenCalledTimes(1);
      expect(assignNextIds).toHaveBeenCalledWith({ type: "instanced", callbackObject: object, count: 1 });
    });

    it("handles single point counts", () => {
      const object = { some: "garbage", points: fillArray(3), colors: fillArray(3) };
      const hitmapProps = createInstancedGetHitmap(1)(object, assignNextIds, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: fillArray(3),
        colors: [intToRGB(1), intToRGB(2), intToRGB(3)],
      });
      expect(assignNextIds).toHaveBeenCalledTimes(1);
      expect(assignNextIds).toHaveBeenCalledWith({ type: "instanced", callbackObject: object, count: 3 });
    });

    it("handles offset point counts", () => {
      const object = { some: "garbage", points: fillArray(4), colors: fillArray(4) };
      const hitmapProps = createInstancedGetHitmap(3)(object, assignNextIds, []);
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: fillArray(4),
        colors: [intToRGB(1), intToRGB(1), intToRGB(1), intToRGB(2)],
      });
      expect(assignNextIds).toHaveBeenCalledTimes(1);
      expect(assignNextIds).toHaveBeenCalledWith({ type: "instanced", callbackObject: object, count: 2 });
    });

    it("filters instances correctly", () => {
      const object = { some: "garbage", points: fillArray(6), colors: fillArray(6) };
      const hitmapProps = createInstancedGetHitmap(2)(object, assignNextIds, toSeenObjects([object], [1]));
      expect(hitmapProps).toEqual({
        some: "garbage",
        points: fillArray(4),
        colors: [intToRGB(1), intToRGB(1), intToRGB(3), intToRGB(3)],
      });
      expect(assignNextIds).toHaveBeenCalledTimes(1);
      expect(assignNextIds).toHaveBeenCalledWith({ type: "instanced", callbackObject: object, count: 3 });
    });

    it("filters objects without points correctly", () => {
      const object = { some: "garbage" };
      const hitmapProps = createInstancedGetHitmap(1)(object, assignNextIds, toSeenObjects([object], [0]));
      expect(hitmapProps).toEqual(undefined);
    });

    it("handles arrays correctly", () => {
      const objects = [
        { some: "garbage", points: fillArray(6), colors: fillArray(6) },
        { some: "other_garbage", points: fillArray(8), colors: fillArray(8) },
      ];
      const hitmapProps = createInstancedGetHitmap(2)(objects, assignNextIds, []);
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
      expect(assignNextIds).toHaveBeenCalledTimes(2);
      expect(assignNextIds).toHaveBeenCalledWith({ type: "instanced", callbackObject: objects[0], count: 3 });
      expect(assignNextIds).toHaveBeenCalledWith({ type: "instanced", callbackObject: objects[1], count: 4 });
    });
  });
});
