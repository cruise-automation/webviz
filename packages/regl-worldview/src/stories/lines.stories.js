//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Worldview, { Lines } from "../index";

const DEFAULT_CAMERA = {
  perspective: false,
  target: [0, 0, 0],
  targetOffset: [0, 0, 0],
  thetaOffset: Math.PI / 2,
  phi: Math.PI / 4,
  distance: 20,
  targetOrientation: [0, 0, 0, 1],
};

storiesOf("Worldview/Lines", module)
  .addDecorator(withKnobs)
  .addDecorator(withScreenshot())
  .add("<Lines> does not render empty points", () => {
    const normalLine = [
      {
        primitive: "line strip",
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        scale: { x: 2, y: 0, z: 0 },
        points: [[0, -4, 0], [0, 4, 0]],
        color: [1, 1, 1, 1],
      },
    ];
    const emptyLine = [
      {
        primitive: "line strip",
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        points: [],
        color: [1, 0, 0, 1],
        scale: { x: 6, y: 0, z: 0 },
      },
    ];
    return (
      <Worldview defaultCameraState={DEFAULT_CAMERA}>
        <Lines>{normalLine}</Lines>
        <Lines>{emptyLine}</Lines>
      </Worldview>
    );
  })
  .add("<Lines> line strip (open)", () => {
    const lines = [
      {
        closed: false,
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 0 },
        },
        scale: { x: 0.1, y: 0.1, z: 0.1 },
        color: { r: 0, g: 1, b: 0, a: 1 },
        points: [{ x: 0, y: -3, z: 0 }, { x: 1, y: -3, z: 0 }, { x: 1, y: -2, z: 0 }, { x: 0, y: -2, z: 0 }],
        colors: [],
        primitive: "line strip",
      },
    ];
    return (
      <Worldview defaultCameraState={{ distance: 10 }}>
        <Lines>{lines}</Lines>
      </Worldview>
    );
  })
  .add("<Lines> line strip (closed)", () => {
    const lines = [
      {
        closed: true,
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 0 },
        },
        scale: { x: 0.1, y: 0.1, z: 0.1 },
        color: { r: 0, g: 1, b: 0, a: 1 },
        points: [{ x: 0, y: -3, z: 0 }, { x: 1, y: -3, z: 0 }, { x: 1, y: -2, z: 0 }, { x: 0, y: -2, z: 0 }],
        colors: [],
        primitive: "line strip",
      },
    ];
    return (
      <Worldview defaultCameraState={{ distance: 10 }}>
        <Lines>{lines}</Lines>
      </Worldview>
    );
  })
  .add("<Lines> wireframe", () => {
    const lines = [
      {
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 0 },
        },
        scale: { x: 0.1, y: 0.1, z: 0.1 },
        color: { r: 0, g: 1, b: 0, a: 1 },
        points: [
          { x: 0, y: -3, z: 1 },
          { x: 1, y: -2, z: 1 },
          { x: 0, y: -3, z: 0 },
          { x: 1, y: -2, z: 0 },

          { x: 0, y: -3, z: 1 },
          { x: 0, y: -3, z: 0 },

          { x: 1, y: -2, z: 1 },
          { x: 0.5, y: 0, z: 1 },
          { x: 1, y: -2, z: 0 },
          { x: 0.5, y: 0, z: 0 },

          { x: 1, y: -2, z: 1 },
          { x: 1, y: -2, z: 0 },

          { x: 0.5, y: 0, z: 1 },
          { x: -1, y: -1, z: 1 },
          { x: 0.5, y: 0, z: 0 },
          { x: -1, y: -1, z: 0 },

          { x: 0.5, y: 0, z: 1 },
          { x: 0.5, y: 0, z: 0 },

          { x: -1, y: -1, z: 1 },
          { x: 0, y: -3, z: 1 },
          { x: -1, y: -1, z: 0 },
          { x: 0, y: -3, z: 0 },

          { x: -1, y: -1, z: 1 },
          { x: -1, y: -1, z: 0 },
        ],
        colors: [],
      },
    ];
    return (
      <Worldview defaultCameraState={{ distance: 10 }}>
        <Lines>{lines}</Lines>
      </Worldview>
    );
  });
