// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Lines from "../../commands/Lines";
import type { Line } from "../../types";
import { generateNonInstancedClickAssertions } from "../worldviewAssertionUtils";

const twoLinesInARow = [
  {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 10, y: 10, z: 10 },
    color: { r: 1, g: 0, b: 1, a: 0.5 },
    points: [[-10, 0, 0], [10, 0, 0]],
  },
  {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 10, y: 10, z: 10 },
    color: { r: 1, g: 0, b: 1, a: 0.5 },
    points: [[-10, -20, 0], [10, -20, 0]],
  },
];

const stories = storiesOf("Integration/Lines", module).addDecorator(withScreenshot());
generateNonInstancedClickAssertions<Line>("Line", Lines, twoLinesInARow).forEach(({ name, story }) =>
  stories.add(name, story)
);
