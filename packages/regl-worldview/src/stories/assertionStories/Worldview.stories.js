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

import Cubes from "../../commands/Cubes";
import { WorldviewWrapper, clickAtOrigin, WORLDVIEW_SIZE } from "../worldviewAssertionUtils";
import { assertionTest, timeout } from "stories/assertionTestUtils";

const cube = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: -20, z: 0 },
  },
  scale: { x: 10, y: 10, z: 10 },
  color: { r: 1, g: 0, b: 1, a: 0.5 },
};

async function emitMouseEvent(eventName: "mousemove" | "mousedown" | "mouseup" | "dblclick"): Promise<void> {
  const [element] = document.getElementsByTagName("canvas");
  if (!element) {
    throw new Error("Could not find canvas element");
  }
  const mouseEvent = new MouseEvent(eventName, {
    bubbles: true,
    clientX: WORLDVIEW_SIZE / 2,
    clientY: WORLDVIEW_SIZE / 2,
  });
  element.dispatchEvent(mouseEvent);
  await timeout(100);
}

const stories = storiesOf("Integration/Worldview", module).addDecorator(withScreenshot());
stories
  .add(
    `Default worldview handler has ray and no objects`,
    assertionTest({
      story: (setTestData) => <WorldviewWrapper onClick={(_, clickInfo) => setTestData(clickInfo)} />,
      assertions: async (getTestData) => {
        await clickAtOrigin();
        const result = await getTestData();
        expect(result.objects.length).toEqual(0);

        // Dir
        expect(result.ray.dir[0]).toBeCloseTo(0);
        expect(result.ray.dir[1]).toBeCloseTo(-1);
        expect(result.ray.dir[2]).toBeCloseTo(0);

        // Origin
        expect(result.ray.origin[0]).toBeCloseTo(0);
        expect(result.ray.origin[1]).toBeCloseTo(75, 1);
        expect(result.ray.origin[2]).toBeCloseTo(0);

        // Point
        expect(result.ray.point[0]).toBeCloseTo(0);
        expect(result.ray.point[1]).toBeCloseTo(75, 1);
        expect(result.ray.point[2]).toBeCloseTo(0);
      },
    })
  )
  .add(
    `onMouseMove does not pick up objects with hitmapOnMouseMove=false`,
    assertionTest({
      story: (setTestData) => (
        <WorldviewWrapper onMouseMove={(_, { objects }) => setTestData(objects)}>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      assertions: async (getTestData) => {
        await emitMouseEvent("mousemove");
        const result = await getTestData();
        expect(result.length).toEqual(0);
      },
    })
  )
  .add(
    `onMouseMove picks up objects with hitmapOnMouseMove=true`,
    assertionTest({
      story: (setTestData) => (
        <WorldviewWrapper onMouseMove={(_, { objects }) => setTestData(objects)} hitmapOnMouseMove>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      assertions: async (getTestData) => {
        await emitMouseEvent("mousemove");
        const result = await getTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(cube);
      },
    })
  )
  .add(
    `onMouseUp detects objects`,
    assertionTest({
      story: (setTestData) => (
        <WorldviewWrapper onMouseUp={(_, { objects }) => setTestData(objects)}>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      assertions: async (getTestData) => {
        await emitMouseEvent("mouseup");
        const result = await getTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(cube);
      },
    })
  )
  .add(
    `onMouseDown detects objects`,
    assertionTest({
      story: (setTestData) => (
        <WorldviewWrapper onMouseDown={(_, { objects }) => setTestData(objects)}>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      assertions: async (getTestData) => {
        await emitMouseEvent("mousedown");
        const result = await getTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(cube);
      },
    })
  )
  .add(
    `onDoubleClick detects objects`,
    assertionTest({
      story: (setTestData) => (
        <WorldviewWrapper onDoubleClick={(_, { objects }) => setTestData(objects)}>
          <Cubes>{[cube]}</Cubes>
        </WorldviewWrapper>
      ),
      assertions: async (getTestData) => {
        await emitMouseEvent("dblclick");
        const result = await getTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(cube);
      },
    })
  );
