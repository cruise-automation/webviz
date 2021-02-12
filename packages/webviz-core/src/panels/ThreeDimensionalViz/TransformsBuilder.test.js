// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mat4 } from "gl-matrix";

import { Transform } from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import { getArrowToParentMarkers } from "webviz-core/src/panels/ThreeDimensionalViz/TransformsBuilder";

describe("TransformBuilder", () => {
  describe("getArrowToParentMarkers", () => {
    const invalidParent = new Transform("parent");
    const matrix = mat4.fromValues(1, 0, 0, 2, 1, 0, 0, 1, 0, 0, 1, 0, 2, 0, 1, 2);

    it("does NOT return arrows to invalid parent if is the NOT root", () => {
      const validChild = Object.assign(new Transform("child"), { matrix, parent: invalidParent });
      validChild.set({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1, w: 1 });
      expect(getArrowToParentMarkers("child", validChild, "some_other_root")).toEqual([]);
    });

    it("returns arrows to invalid parent if is the root", () => {
      const validChild = Object.assign(new Transform("child"), { matrix, parent: invalidParent });
      validChild.set({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1, w: 1 });
      expect(getArrowToParentMarkers("child", validChild, "parent")).not.toEqual([]);
    });

    it("does NOT return arrows if the distance between the parent and child is 0", () => {
      const parent = new Transform("parent");
      const child = Object.assign(new Transform("child"), { parent });
      child.set({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, w: 1 });
      expect(getArrowToParentMarkers("child", child, "some_other_root")).toEqual([]);
    });
  });
});
