// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import expect from "expect";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Cubes from "../../commands/Cubes";
import GLText from "../../commands/GLText";
import { clickAtOrigin, WorldviewWrapper } from "../worldviewAssertionUtils";
import { assertionTest } from "stories/assertionTestUtils";

const glText = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: 0, z: 0 },
  },
  scale: { x: 1, y: 1, z: 1 },
  color: { r: 1, g: 1, b: 1, a: 1 },
  text: "CLICK ME!",
  billboard: true,
};

const glTextWithO = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: 0, z: 0 },
  },
  scale: { x: 1, y: 1, z: 1 },
  color: { r: 1, g: 1, b: 1, a: 1 },
  text: "O",
  billboard: true,
};

const cube = {
  pose: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    position: { x: 0, y: -20, z: 0 },
  },
  scale: { x: 10, y: 10, z: 10 },
  color: { r: 1, g: 0, b: 1, a: 0.5 },
};

storiesOf("Integration/GLText", module)
  .addDecorator(withScreenshot())
  .add(
    `Clicks on a single GLText object - worldview event handler`,
    assertionTest({
      story: (setTestData) => {
        return (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
            <GLText highResolutionFont scaleInvariant scaleInvariantFontSize={40}>
              {[glText]}
            </GLText>
          </WorldviewWrapper>
        );
      },
      assertions: async (getTestData) => {
        await clickAtOrigin();
        const result = getTestData();
        expect(result).toEqual([{ object: glText, instanceIndex: undefined }]);
      },
    })
  )
  .add(
    `Clicks on a single GLText object with O - worldview event handler`,
    assertionTest({
      story: (setTestData) => {
        return (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
            <GLText highResolutionFont scaleInvariant scaleInvariantFontSize={40}>
              {[glTextWithO]}
            </GLText>
          </WorldviewWrapper>
        );
      },
      assertions: async (getTestData) => {
        await clickAtOrigin();
        const result = getTestData();
        expect(result).toEqual([{ object: glTextWithO, instanceIndex: undefined }]);
      },
    })
  )
  .add(
    `Clicks on GLText with an object behind it. Stacked objects disabled - worldview event handler`,
    assertionTest({
      story: (setTestData) => {
        return (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
            <GLText highResolutionFont scaleInvariant scaleInvariantFontSize={40}>
              {[glText]}
            </GLText>
            <Cubes>{[cube]}</Cubes>
          </WorldviewWrapper>
        );
      },
      assertions: async (getTestData) => {
        await clickAtOrigin();
        const result = getTestData();
        expect(result.length).toEqual(1);
        expect(result[0].object).toEqual(glText);
      },
    })
  )
  .add(
    `Clicks on GLText with an object behind it - worldview event handler`,
    assertionTest({
      story: (setTestData) => {
        return (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} enableStackedObjectEvents>
            <GLText highResolutionFont scaleInvariant scaleInvariantFontSize={40}>
              {[glText]}
            </GLText>
            <Cubes>{[cube]}</Cubes>
          </WorldviewWrapper>
        );
      },
      assertions: async (getTestData) => {
        await clickAtOrigin();
        const result = getTestData();
        expect(result.length).toEqual(2);
        expect(result[0].object).toEqual(glText);
        expect(result[1].object).toEqual(cube);
      },
    })
  );
