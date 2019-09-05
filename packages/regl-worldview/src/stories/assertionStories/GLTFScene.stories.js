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
import { withScreenshot } from "storybook-chrome-screenshot";

import GLTFScene from "../../commands/GLTFScene";
import { clickAtOrigin, WorldviewWrapper } from "../worldviewAssertionUtils";
import { assertionTest, timeout } from "stories/assertionTestUtils";

const firstModelPosition = {
  pose: {
    position: { x: 0, y: 0, z: -5 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  },
  scale: { x: 10, y: 10, z: 10 },
};
const secondModelPosition = {
  pose: {
    position: { x: 0, y: -20, z: -5 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  },
  scale: { x: 10, y: 10, z: 10 },
};

// For the GLTFScene, requiring the duck GLB model, parsing it, and loading it takes a bit of time. Wait some time to
// ensure that the module has been loaded.
const WAIT_FOR_MODEL_LOAD_TIMEOUT = 2000;

const stories = storiesOf("Integration/GLTFScene", module).addDecorator(withScreenshot());
stories
  .add(
    `Clicks on a single GLTFScene object - worldview event handler`,
    assertionTest({
      story: (setTestData) => {
        const duckModel = require("common/fixtures/Duck.glb");
        return (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
            <GLTFScene model={duckModel}>{firstModelPosition}</GLTFScene>
            <GLTFScene model={duckModel}>{secondModelPosition}</GLTFScene>
          </WorldviewWrapper>
        );
      },
      assertions: async (getTestData) => {
        await timeout(WAIT_FOR_MODEL_LOAD_TIMEOUT);
        await clickAtOrigin();
        const result = getTestData();
        expect(result).toEqual([{ object: firstModelPosition, instanceIndex: undefined }]);
      },
    })
  )
  .add(
    `Clicks on a GLTFSCene object with an object behind it - worldview event handler`,
    assertionTest({
      story: (setTestData) => {
        const duckModel = require("common/fixtures/Duck.glb");
        let testData = [];
        return (
          <WorldviewWrapper enableStackedObjectEvents>
            <GLTFScene
              onClick={(_, { objects }) => {
                testData = testData.concat(objects);
                setTestData(testData);
              }}
              model={duckModel}>
              {firstModelPosition}
            </GLTFScene>
            <GLTFScene
              onClick={(_, { objects }) => {
                testData = testData.concat(objects);
                setTestData(testData);
              }}
              model={duckModel}>
              {secondModelPosition}
            </GLTFScene>
          </WorldviewWrapper>
        );
      },
      assertions: async (getTestData) => {
        await timeout(WAIT_FOR_MODEL_LOAD_TIMEOUT);
        await clickAtOrigin();
        const result = await getTestData();
        expect(result).toEqual([
          { object: firstModelPosition, instanceIndex: undefined },
          { object: secondModelPosition, instanceIndex: undefined },
        ]);
      },
    })
  );
