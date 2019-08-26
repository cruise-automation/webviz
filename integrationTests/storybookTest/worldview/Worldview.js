// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import type { Page } from "puppeteer";
import React from "react";
import { Cubes } from "regl-worldview";

import { WorldviewWrapper, clickAtOrigin, WORLDVIEW_SIZE } from "../testUtils";
import type { IntegrationTestModule } from "../types";

declare var page: Page;

const cube = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: -20, z: 0 },
  },
  scale: { x: 10, y: 10, z: 10 },
  color: { r: 1, g: 0, b: 1, a: 0.5 },
};

const WorldviewTests: IntegrationTestModule = {
  name: "Worldview",
  tests: [
    {
      name: `Default worldview handler has ray and no objects`,
      story: (setTestData) => <WorldviewWrapper onClick={(_, clickInfo) => setTestData(clickInfo)} />,
      test: async (readFromTestData) => {
        await clickAtOrigin();
        const result = await readFromTestData();
        expect(result.objects.length).toEqual(0);

        // Dir
        expect(result.ray.dir[0]).toBeCloseTo(0);
        expect(result.ray.dir[1]).toBeCloseTo(-1);
        expect(result.ray.dir[2]).toBeCloseTo(0);

        // Origin
        expect(result.ray.origin[0]).toBeCloseTo(0);
        expect(result.ray.origin[1]).toBeCloseTo(75, 1);
        expect(result.ray.origin[2]).toBeCloseTo(0);

        // point
        expect(result.ray.point[0]).toBeCloseTo(0);
        expect(result.ray.point[1]).toBeCloseTo(75, 1);
        expect(result.ray.point[2]).toBeCloseTo(0);
      },
    },
    {
      name: `onMouseMove does not pick up objects with hitmapOnMouseMove=false`,
      story: (setTestData) => (
        <WorldviewWrapper onMouseMove={(_, { objects }) => setTestData(objects)}>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await page.mouse.move(WORLDVIEW_SIZE / 3, WORLDVIEW_SIZE / 3);
        await page.mouse.move(WORLDVIEW_SIZE / 2, WORLDVIEW_SIZE / 2);
        const result = await readFromTestData();
        expect(result.length).toEqual(0);
      },
    },
    {
      name: `onMouseMove picks up objects with hitmapOnMouseMove=true`,
      story: (setTestData) => (
        <WorldviewWrapper onMouseMove={(_, { objects }) => setTestData(objects)} hitmapOnMouseMove>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await page.mouse.move(WORLDVIEW_SIZE / 3, WORLDVIEW_SIZE / 3);
        await page.mouse.move(WORLDVIEW_SIZE / 2, WORLDVIEW_SIZE / 2);
        const result = await readFromTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(cube);
      },
    },
    {
      name: `onMouseUp detects objects`,
      story: (setTestData) => (
        <WorldviewWrapper onMouseUp={(_, { objects }) => setTestData(objects)}>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await page.mouse.move(WORLDVIEW_SIZE / 2, WORLDVIEW_SIZE / 2);
        await page.mouse.up();
        const result = await readFromTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(cube);
      },
    },
    {
      name: `onMouseDown detects objects`,
      story: (setTestData) => (
        <WorldviewWrapper onMouseDown={(_, { objects }) => setTestData(objects)}>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await page.mouse.move(WORLDVIEW_SIZE / 2, WORLDVIEW_SIZE / 2);
        await page.mouse.down();
        const result = await readFromTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(cube);
      },
    },
    {
      name: `onDoubleClick detects objects`,
      story: (setTestData) => (
        <WorldviewWrapper onDoubleClick={(_, { objects }) => setTestData(objects)}>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      test: async (readFromTestData) => {
        await page.mouse.click(WORLDVIEW_SIZE / 2, WORLDVIEW_SIZE / 2, { clickCount: 2 });
        const result = await readFromTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(cube);
      },
    },
  ],
};

export default WorldviewTests;
