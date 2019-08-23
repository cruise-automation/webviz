// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import React from "react";
import { Grid } from "regl-worldview";

import { WorldviewWrapper, clickAtOrigin } from "../testUtils";
import type { IntegrationTestModule } from "../types";

const COUNT = 6;

// We override the default camera state to make the (very small) grid lines easier to click.
const defaultCameraState = {
  distance: 75,
  perspective: true,
  phi: 1.4780810950068166,
  target: [0, 0, 0],
  targetOffset: [0, 0, 0],
  targetOrientation: [0, 0, 0, 1],
  thetaOffset: 3.1015926535897935,
};

const GridTests: IntegrationTestModule = {
  name: "Grid",
  // The grid does have individual event handlers, but they could still be clicked on by worldview event handlers.
  tests: [
    {
      name: `Clicks on a Grid - worldview event handler`,
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} defaultCameraState={defaultCameraState}>
          <Grid count={COUNT} />
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual({ count: COUNT });
      },
    },
  ],
};

export default GridTests;
