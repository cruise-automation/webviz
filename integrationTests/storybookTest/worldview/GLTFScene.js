// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import type { Page } from "puppeteer";
import React from "react";
import { GLTFScene } from "regl-worldview";

import { clickAtOrigin, WorldviewWrapper } from "../testUtils";
import type { IntegrationTestModule } from "../types";

declare var page: Page;

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

const ArrowsTests: IntegrationTestModule = {
  name: "GLTFScene",
  tests: [
    {
      name: `Clicks on a single GLTFScene model - worldview event handler`,
      story: (setTestData) => {
        const duckModel = require("./fixtures/Duck.glb");
        return (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
            <GLTFScene model={duckModel}>{firstModelPosition}</GLTFScene>
            <GLTFScene model={duckModel}>{secondModelPosition}</GLTFScene>
          </WorldviewWrapper>
        );
      },
      test: async (readFromTestData) => {
        await page.waitFor(WAIT_FOR_MODEL_LOAD_TIMEOUT);
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result).toEqual([{ object: firstModelPosition }]);
      },
    },
    {
      name: `Clicks on a single GLTFScene model - object event handler`,
      story: (setTestData) => {
        const duckModel = require("./fixtures/Duck.glb");
        let testData = [];
        return (
          <WorldviewWrapper>
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
      test: async (readFromTestData) => {
        await page.waitFor(WAIT_FOR_MODEL_LOAD_TIMEOUT);
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result).toEqual([{ object: firstModelPosition }]);
      },
    },
    {
      name: `Clicks on multiple GLTFScene models - worldview event handler`,
      story: (setTestData) => {
        const duckModel = require("./fixtures/Duck.glb");
        return (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} enableStackedObjectEvents>
            <GLTFScene model={duckModel}>{firstModelPosition}</GLTFScene>
            <GLTFScene model={duckModel}>{secondModelPosition}</GLTFScene>
          </WorldviewWrapper>
        );
      },
      test: async (readFromTestData) => {
        await page.waitFor(WAIT_FOR_MODEL_LOAD_TIMEOUT);
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result).toEqual([{ object: firstModelPosition }, { object: secondModelPosition }]);
      },
    },
    {
      name: `Clicks on multiple GLTFScene models - object event handler`,
      story: (setTestData) => {
        const duckModel = require("./fixtures/Duck.glb");
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
      test: async (readFromTestData) => {
        await page.waitFor(WAIT_FOR_MODEL_LOAD_TIMEOUT);
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result).toEqual([{ object: firstModelPosition }, { object: secondModelPosition }]);
      },
    },
  ],
};

export default ArrowsTests;
