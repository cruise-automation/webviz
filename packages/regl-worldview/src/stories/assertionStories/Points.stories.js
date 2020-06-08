// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";

import Points from "../../commands/Points";
import type { PointType } from "../../types";
import { generateNonInstancedClickAssertions, generateInstancedClickAssertions } from "../worldviewAssertionUtils";

const twoPointsInARow = [
  {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 20, y: 20, z: 20 },
    colors: [{ r: 1, g: 1, b: 0, a: 0.5 }],
    points: [[0, 0, 0]],
  },
  {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 20, y: 20, z: 20 },
    colors: [{ r: 1, g: 0, b: 1, a: 0.5 }],
    points: [[0, -20, 0]],
  },
];

const instancedPoints = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: 0, z: 0 },
  },
  scale: { x: 20, y: 20, z: 20 },
  colors: [{ r: 1, g: 0, b: 1, a: 0.5 }, { r: 1, g: 1, b: 0, a: 0.5 }],
  points: [[0, 0, 0], [0, -20, 0]],
};

const stories = storiesOf("Integration/Points", module);
generateNonInstancedClickAssertions<PointType>("Point", Points, twoPointsInARow).forEach(({ name, story }) =>
  stories.add(name, story)
);
generateInstancedClickAssertions<PointType>("Point", Points, instancedPoints).forEach(({ name, story }) =>
  stories.add(name, story)
);
