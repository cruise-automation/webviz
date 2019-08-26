// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Triangles, type TriangleList } from "regl-worldview";

import { generateNonInstancedClickTests, generateInstancedClickTests } from "../testUtils";
import type { IntegrationTestModule } from "../types";

const twoTrianglesInARow = [
  {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 20, y: 20, z: 20 },
    colors: [{ r: 1, g: 1, b: 0, a: 0.5 }, { r: 1, g: 1, b: 0, a: 0.5 }, { r: 1, g: 1, b: 0, a: 0.5 }],
    points: [[-10, 0, 0], [0, 0, 10], [10, 0, -10]],
  },
  {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 20, y: 20, z: 20 },
    color: { r: 1, g: 0, b: 1, a: 0.5 },
    colors: [{ r: 1, g: 0, b: 1, a: 0.5 }, { r: 1, g: 0, b: 1, a: 0.5 }, { r: 1, g: 0, b: 1, a: 0.5 }],
    points: [[-10, -20, 0], [0, -20, 10], [10, -20, -10]],
  },
];

const instancedTriangles = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: 0, z: 0 },
  },
  scale: { x: 20, y: 20, z: 20 },
  color: { r: 1, g: 0, b: 1, a: 0.5 },
  colors: [
    { r: 1, g: 1, b: 0, a: 0.5 },
    { r: 1, g: 1, b: 0, a: 0.5 },
    { r: 1, g: 1, b: 0, a: 0.5 },
    { r: 1, g: 0, b: 1, a: 0.5 },
    { r: 1, g: 0, b: 1, a: 0.5 },
    { r: 1, g: 0, b: 1, a: 0.5 },
  ],
  points: [[-10, 0, 0], [0, 0, 10], [10, 0, -10], [-10, -20, 0], [0, -20, 10], [10, -20, -10]],
};

const TrianglesTests: IntegrationTestModule = {
  name: "Triangles",
  tests: [
    ...generateNonInstancedClickTests<TriangleList>("Triangle", Triangles, twoTrianglesInARow),
    ...generateInstancedClickTests<TriangleList>("Triangle", Triangles, instancedTriangles),
  ],
};

export default TrianglesTests;
