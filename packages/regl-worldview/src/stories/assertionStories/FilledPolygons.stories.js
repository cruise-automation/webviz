// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import polygonGenerator from "polygon-generator";

import FilledPolygons from "../../commands/FilledPolygons";
import type { PolygonType } from "../../types";
import { generateNonInstancedClickAssertions } from "../worldviewAssertionUtils";

const polygon = polygonGenerator.coordinates(5, 10, 30);

const twoFilledPolygonsInARow = [
  {
    scale: { x: 1, y: 1, z: 1 },
    pose: {
      position: { x: -10, y: -10, z: 10 },
      orientation: { x: -0.5, y: 0, z: 0, w: 1 },
    },
    points: polygon.map(({ x, y }) => ({ x, y, z: 0 })),
    color: { r: 1, g: 1, b: 0, a: 1 },
  },
  {
    scale: { x: 1, y: 1, z: 1 },
    pose: {
      position: { x: -10, y: 10, z: -10 },
      orientation: { x: 0.5, y: 0, z: 0, w: 1 },
    },
    points: polygon.map(({ x, y }) => ({ x, y, z: 0 })),
    color: { r: 1, g: 0, b: 1, a: 1 },
  },
];

const stories = storiesOf("Integration/FilledPolygons", module);
generateNonInstancedClickAssertions<PolygonType>("FilledPolygon", FilledPolygons, twoFilledPolygonsInARow, {
  // Because filled polygons have some weird rendering, the second always shows up on top. They can't really be
  // stacked correctly anyways so this rendering artifact isn't important, just that we test the hitmap code.
  overrideExpectedSingleObjects: [{ object: twoFilledPolygonsInARow[1], instanceIndex: undefined }],
  overrideExpectedMultipleObjects: [
    { object: twoFilledPolygonsInARow[1], instanceIndex: undefined },
    { object: twoFilledPolygonsInARow[0], instanceIndex: undefined },
  ],
}).forEach(({ name, story }) => stories.add(name, story));
