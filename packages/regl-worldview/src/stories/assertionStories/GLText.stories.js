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
import GLText from "../../commands/GLText";
import { clickAtOrigin, WorldviewWrapper } from "../worldviewAssertionUtils";
import { assertionTest } from "stories/assertionTestUtils";

function textMarkers({
  text,
  billboard,
  background = false,
}: {
  text: string,
  billboard?: ?boolean,
  background?: ?boolean,
}) {
  const color = { r: 1, g: 1, b: 1, a: 1 };
  return [
    {
      text,
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: 0, y: 0, z: 0 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color,
      colors: background ? [color, { r: 1, g: 1, b: 0, a: 1 }] : undefined,
      billboard,
    },
  ];
}

function createAssertionTest(markers, scaleInvariant) {
  const expected = markers;
  return assertionTest({
    story: (setTestData) => {
      return (
        <WorldviewWrapper
          defaultCameraState={{ perspective: true, distance: 10 }}
          onClick={(_, { objects }) => setTestData(objects)}>
          <GLText scaleInvariantFontSize={scaleInvariant ? 40 : undefined}>{markers}</GLText>
        </WorldviewWrapper>
      );
    },
    assertions: async (getTestData) => {
      await clickAtOrigin();
      const result = getTestData();
      expect(result.length).toEqual(expected.length);
      for (let i = 0; i < expected.length; i++) {
        expect(result[0].object).toEqual(expected[0]);
      }
    },
  });
}

function createAssertionTestWithBackgroundObjects(markers, stackedObjectsEnabled) {
  const backgroundObjects = [
    {
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: 0, y: 1, z: -1 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 1, g: 0, b: 1, a: 0.5 },
    },
  ];
  const expected = stackedObjectsEnabled ? [...markers, ...backgroundObjects] : markers;
  return assertionTest({
    story: (setTestData) => {
      return (
        <WorldviewWrapper
          defaultCameraState={{ perspective: true, distance: 10 }}
          onClick={(_, { objects }) => setTestData(objects)}
          enableStackedObjectEvents={stackedObjectsEnabled}>
          <GLText>{markers}</GLText>
          <Cubes>{backgroundObjects}</Cubes>
        </WorldviewWrapper>
      );
    },
    assertions: async (getTestData) => {
      await clickAtOrigin();
      const result = getTestData();
      expect(result.length).toEqual(expected.length);
      for (let i = 0; i < expected.length; i++) {
        expect(result[0].object).toEqual(expected[0]);
      }
    },
  });
}

storiesOf("Integration/GLText", module)
  .addDecorator(withScreenshot())
  .add(
    `Clicks on a single GLText object - worldview event handler`,
    createAssertionTest(textMarkers({ text: "Click Me!" }))
  )
  .add(
    `Clicks on a single GLText billboard object - worldview event handler`,
    createAssertionTest(textMarkers({ text: "Click Me!", billboard: true }))
  )
  .add(
    `Clicks on a single GLText object with background - worldview event handler`,
    createAssertionTest(textMarkers({ text: "Click Me!", background: true }))
  )
  .add(
    `Clicks on a single GLText billboard object with background - worldview event handler`,
    createAssertionTest(textMarkers({ text: "Click Me!", billboard: true, background: true }))
  )
  .add(
    `Clicks on a single GLText object using scale invariance - worldview event handler`,
    createAssertionTest(textMarkers({ text: "Click Me!", billboard: true }), true)
  )
  .add(
    `Clicks on a single GLText object with a hole in a glyph - worldview event handler`,
    createAssertionTest(textMarkers({ text: "O" }))
  )
  .add(
    `Clicks on GLText with an object behind it. Stacked objects disabled - worldview event handler`,
    createAssertionTestWithBackgroundObjects(textMarkers({ text: "Click Me!", billboard: true }))
  )
  .add(
    `Clicks on GLText with an object behind it - worldview event handler`,
    createAssertionTestWithBackgroundObjects(textMarkers({ text: "Click Me!", billboard: true }), true)
  )
  .add(
    `Clicks on GLText with a hole and an object behind it. Stacked objects disabled - worldview event handler`,
    createAssertionTestWithBackgroundObjects(textMarkers({ text: "O", billboard: true }))
  )
  .add(
    `Clicks on GLText with a hole and an object behind it - worldview event handler`,
    createAssertionTestWithBackgroundObjects(textMarkers({ text: "O", billboard: true }), true)
  );
