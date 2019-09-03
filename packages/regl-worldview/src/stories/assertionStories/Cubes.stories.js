// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Cubes from "../../commands/Cubes";
import type { Cube } from "../../types";
import { generateNonInstancedClickAssertions, generateInstancedClickAssertions } from "../worldviewAssertionUtils";

const twoCubesInARow = [
  {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 10, y: 10, z: 10 },
    color: { r: 1, g: 0, b: 1, a: 0.5 },
  },
  {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: -20, z: 0 },
    },
    scale: { x: 10, y: 10, z: 10 },
    color: { r: 1, g: 0, b: 1, a: 0.5 },
  },
];

const instancedCube = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: 0, z: 0 },
  },
  scale: { x: 10, y: 10, z: 10 },
  colors: [{ r: 1, g: 0, b: 1, a: 0.5 }, { r: 1, g: 0, b: 1, a: 0.5 }],
  points: [[0, 0, 0], [0, -20, 0]],
};

const stories = storiesOf("Integration/Cubes", module).addDecorator(withScreenshot());
generateNonInstancedClickAssertions<Cube>("Cube", Cubes, twoCubesInARow).forEach(({ name, story }) =>
  stories.add(name, story)
);
generateInstancedClickAssertions<Cube>("Cube", Cubes, instancedCube).forEach(({ name, story }) =>
  stories.add(name, story)
);
