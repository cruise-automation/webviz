// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import React from "react";
import { Axes } from "regl-worldview";

import { WorldviewWrapper, clickAtOrigin } from "../testUtils";
import type { IntegrationTestModule } from "../types";

const defaultXAxis = {
  color: { a: 1, b: 0.4, g: 0.26, r: 0.95 },
  points: [{ x: -100, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }],
  pose: { orientation: { w: 0, x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } },
  scale: { x: 0.5, y: 0.5, z: 0.5 },
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
  ],
};

export default ArrowsTests;
