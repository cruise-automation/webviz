// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Triangles from "../../commands/Triangles";
import type { TriangleList } from "../../types";
import { generateNonInstancedClickAssertions, generateInstancedClickAssertions } from "../worldviewAssertionUtils";

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

const stories = storiesOf("Integration/Triangles", module).addDecorator(withScreenshot());
generateNonInstancedClickAssertions<TriangleList>("Triangle", Triangles, twoTrianglesInARow).forEach(
  ({ name, story }) => stories.add(name, story)
);
generateNonInstancedClickAssertions<TriangleList>(
  "Triangle with onlyRenderInHitmap=true",
  Triangles,
  twoTrianglesInARow.map((triangle) => ({ ...triangle, onlyRenderInHitmap: true }))
).forEach(({ name, story }) => stories.add(name, story));
generateInstancedClickAssertions<TriangleList>("Triangle", Triangles, instancedTriangles).forEach(({ name, story }) =>
  stories.add(name, story)
);
