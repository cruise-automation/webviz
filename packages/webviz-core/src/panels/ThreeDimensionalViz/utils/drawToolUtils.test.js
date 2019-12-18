// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { polygonsToPoints, pointsToPolygons, getFormattedString } from "./drawToolUtils";
import { EDIT_FORMAT } from "webviz-core/src/components/ValidatedInput";

const points = [[{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }], [{ x: 4, y: 4 }, { x: 5, y: 5 }, { x: 6, y: 6 }]];
const polygons = [
  {
    active: false,
    id: 1,
    name: "0",
    points: [
      { active: false, id: 2, point: [1, 1, 0] },
      { active: false, id: 3, point: [2, 2, 0] },
      { active: false, id: 4, point: [3, 3, 0] },
    ],
  },
  {
    active: false,
    id: 5,
    name: "1",
    points: [
      { active: false, id: 6, point: [4, 4, 0] },
      { active: false, id: 7, point: [5, 5, 0] },
      { active: false, id: 8, point: [6, 6, 0] },
    ],
  },
];

describe("drawToolUtils", () => {
  describe("polygonsToPoints", () => {
    it("converts polygons to points", async () => {
      expect(polygonsToPoints(polygons)).toEqual(points);
    });
  });
  describe("pointsToPolygons", () => {
    it("converts polygon points to polygons", () => {
      expect(pointsToPolygons(points)).toEqual(polygons);
    });
  });
  describe("getFormattedString", () => {
    it("returns json format", async () => {
      expect(JSON.parse(getFormattedString(points, EDIT_FORMAT.JSON))).toEqual(points);
    });
    it("handles empty input for json format", async () => {
      expect(getFormattedString([], EDIT_FORMAT.JSON)).toEqual("[]");
    });
    it("returns yaml format", () => {
      expect(getFormattedString(points, EDIT_FORMAT.YAML)).toEqual(`- - x: 1
    y: 1
  - x: 2
    y: 2
  - x: 3
    y: 3

- - x: 4
    y: 4
  - x: 5
    y: 5
  - x: 6
    y: 6`);
    });
    it("handles empty input for yaml format", async () => {
      expect(getFormattedString([], EDIT_FORMAT.YAML)).toEqual("");
      expect(getFormattedString([[]], EDIT_FORMAT.YAML)).toEqual("");
    });
  });
});
