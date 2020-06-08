// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import { storiesOf } from "@storybook/react";
import expect from "expect";
import React from "react";

import Cubes from "../../commands/Cubes";
import Grid from "../../commands/Grid";
import { WorldviewWrapper, clickAtOrigin } from "../worldviewAssertionUtils";
import { assertionTest } from "stories/assertionTestUtils";

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

const cube = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: -20, z: 0 },
  },
  scale: { x: 10, y: 10, z: 10 },
  color: { r: 1, g: 0, b: 1, a: 0.5 },
};

storiesOf("Integration/Grid", module)
  .add(
    "Clicks on a Grid - worldview event handler",
    // The grid does have individual event handlers, but they could still be clicked on by worldview event handlers.
    assertionTest({
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} defaultCameraState={defaultCameraState}>
          <Grid count={COUNT} />
        </WorldviewWrapper>
      ),
      assertions: async (getTestData) => {
        await clickAtOrigin();
        const result = getTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual({ count: COUNT });
      },
    })
  )
  .add(
    "Clicks on a Grid with an object behind it - worldview event handler",
    // Make sure that the axis removes itself from the `excludedObjects`.
    assertionTest({
      story: (setTestData) => (
        <WorldviewWrapper
          onClick={(_, { objects }) => setTestData(objects)}
          defaultCameraState={defaultCameraState}
          enableStackedObjectEvents>
          <Grid count={COUNT} />
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      assertions: async (getTestData) => {
        await clickAtOrigin();
        const result = getTestData();
        expect(result.length).toEqual(2);
        expect(result[0].object).toEqual({ count: COUNT });
        expect(result[1].object).toEqual(cube);
      },
    })
  );
