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
import GLText from "../../commands/GLText";
import { type TextMarker } from "../../commands/Text";
import { clickAtOrigin, WorldviewWrapper } from "../worldviewAssertionUtils";
import { assertionTest } from "stories/assertionTestUtils";

function textMarkers({
  text,
  billboard,
  background = false,
}: {|
  text: string,
  billboard?: ?boolean,
  background?: ?boolean,
|}): TextMarker[] {
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

function createAssertionTest({
  markers,
  enableScaleInvariant,
  includeBackgroundObjects,
  enableStackedObjectEvents,
}: {|
  markers: any[],
  enableScaleInvariant?: boolean,
  includeBackgroundObjects?: boolean,
  enableStackedObjectEvents?: boolean,
|}) {
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
  const expected = enableStackedObjectEvents ? [...markers, ...backgroundObjects] : markers;
  return assertionTest({
    story: (setTestData) => {
      return (
        <WorldviewWrapper
          defaultCameraState={{ perspective: true, distance: 10 }}
          onClick={(_, { objects }) => setTestData(objects)}
          enableStackedObjectEvents={enableStackedObjectEvents}>
          <GLText scaleInvariantFontSize={enableScaleInvariant ? 40 : undefined}>{markers}</GLText>
          <Cubes>{includeBackgroundObjects ? backgroundObjects : []}</Cubes>
        </WorldviewWrapper>
      );
    },
    assertions: async (getTestData) => {
      await clickAtOrigin();
      const result = getTestData();
      expect(result.length).toEqual(enableStackedObjectEvents ? expected.length : 1);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].object).toEqual(expected[i]);
      }
    },
  });
}

storiesOf("Integration/GLText", module)
  .add(
    `Clicks on a single GLText object - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({
        text: "Click Me!",
      }),
    })
  )
  .add(
    `Clicks on a single GLText billboard object - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({
        text: "Click Me!",
        billboard: true,
      }),
    })
  )
  .add(
    `Clicks on a single GLText object with background - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({
        text: "Click Me!",
        background: true,
      }),
    })
  )
  .add(
    `Clicks on a single GLText billboard object with background - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({
        text: "Click Me!",
        billboard: true,
        background: true,
      }),
    })
  )
  .add(
    `Clicks on a single GLText object using scale invariance - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({ text: "Click Me!", billboard: true }),
      enableScaleInvariant: true,
    })
  )
  .add(
    `Clicks on a single GLText object with a hole in a glyph - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({
        text: "O",
      }),
    })
  )
  .add(
    `Clicks on GLText with an object behind it. Stacked objects disabled - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({
        text: "Click Me!",
        billboard: true,
      }),
      includeBackgroundObjects: true,
    })
  )
  .add(
    `Clicks on GLText with an object behind it - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({
        text: "Click Me!",
        billboard: true,
      }),
      includeBackgroundObjects: true,
      enableStackedObjectEvents: true,
    })
  )
  .add(
    `Clicks on GLText with a hole and an object behind it. Stacked objects disabled - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({
        text: "O",
        billboard: true,
      }),
      includeBackgroundObjects: true,
    })
  )
  .add(
    `Clicks on GLText with a hole and an object behind it - worldview event handler`,
    createAssertionTest({
      markers: textMarkers({
        text: "O",
        billboard: true,
      }),
      includeBackgroundObjects: true,
      enableStackedObjectEvents: true,
    })
  );
