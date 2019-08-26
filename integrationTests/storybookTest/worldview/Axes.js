// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import React from "react";
import { Axes, Cubes } from "regl-worldview";

import { WorldviewWrapper, clickAtOrigin } from "../testUtils";
import type { IntegrationTestModule } from "../types";

const defaultXAxis = {
  color: { a: 1, b: 0.4, g: 0.26, r: 0.95 },
  points: [{ x: -100, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }],
  pose: { orientation: { w: 0, x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } },
  scale: { x: 0.5, y: 0.5, z: 0.5 },
};

const defaultZAxis = {
  color: { a: 1, b: 0.92, g: 0.51, r: 0.11 },
  points: [{ x: 0, y: 0, z: -100 }, { x: 0, y: 0, z: 100 }],
  pose: { orientation: { w: 0, x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } },
  scale: { x: 0.5, y: 0.5, z: 0.5 },
};

const cube = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: -20, z: 0 },
  },
  scale: { x: 10, y: 10, z: 10 },
  color: { r: 1, g: 0, b: 1, a: 0.5 },
};

const ArrowsTests: IntegrationTestModule = {
  name: "Axes",
  // Axes do not have individual event handlers, but they could still be clicked on by worldview event handlers.
  tests: [
    {
      name: `Clicks on a single Axis - worldview event handler`,
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
          <Axes />
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(defaultXAxis);
      },
    },
    {
      // Make sure that the axis removes itself from the `excludedObjects`.
      name: `Clicks on Axes with an object behind it - worldview event handler`,
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} enableStackedObjectEvents>
          <Axes />
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result.length).toEqual(3);
        expect(result[0].object).toEqual(defaultXAxis);
        expect(result[1].object).toEqual(defaultZAxis);
        expect(result[2].object).toEqual(cube);
      },
    },
  ],
};

export default ArrowsTests;
