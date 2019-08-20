// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import * as React from "react";
import { Cubes } from "regl-worldview";

import { clickAtOrigin, WorldviewWrapper } from "../testUtils";
import type { IntegrationTestModule } from "../types";

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

const CubesTests: IntegrationTestModule = {
  name: "Cubes",
  tests: [
    {
      name: "Clicks on a single cube - worldview event handler",
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
          <Cubes>{twoCubesInARow}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result).toEqual([{ object: twoCubesInARow[0] }]);
      },
    },
    {
      name: "Clicks on a single cube - object event handler",
      story: (setTestData) => (
        <WorldviewWrapper>
          <Cubes onClick={(_, { objects }) => setTestData(objects)}>{twoCubesInARow}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result).toEqual([{ object: twoCubesInARow[0] }]);
      },
    },
    {
      name: "Clicks on multiple cubes - worldview event handler",
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} enableStackedObjectEvents>
          <Cubes>{twoCubesInARow}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result).toEqual([{ object: twoCubesInARow[0] }, { object: twoCubesInARow[1] }]);
      },
    },
    {
      name: "Clicks on multiple cubes - object event handler",
      story: (setTestData) => (
        <WorldviewWrapper enableStackedObjectEvents>
          <Cubes onClick={(_, { objects }) => setTestData(objects)}>{twoCubesInARow}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result).toEqual([{ object: twoCubesInARow[0] }, { object: twoCubesInARow[1] }]);
      },
    },
  ],
};

export default CubesTests;
