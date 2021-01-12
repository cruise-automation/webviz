//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/react";
import React from "react";

import { Triangles } from "../index";
import Container from "./Container";
import { withCustomRenderStates } from "./util";

const singleTriangle = (x, y, z) => {
  return {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x, y, z },
    },
    scale: { x: 20, y: 20, z: 20 },
    colors: [{ r: 1, g: 1, b: 0, a: 1 }, { r: 1, g: 1, b: 0, a: 1 }, { r: 1, g: 1, b: 0, a: 1 }],
    points: [[-10, 0, 0], [0, 0, 10], [10, 0, -10]],
  };
};

const instancedTriangles = (x, y, z) => {
  return {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x, y, z },
    },
    scale: { x: 20, y: 20, z: 20 },
    color: { r: 1, g: 0, b: 1, a: 0.5 },
    colors: [
      { r: 1, g: 1, b: 0, a: 1 },
      { r: 1, g: 1, b: 0, a: 1 },
      { r: 1, g: 1, b: 0, a: 1 },
      { r: 1, g: 0, b: 0, a: 1 },
      { r: 1, g: 0, b: 0, a: 1 },
      { r: 1, g: 0, b: 0, a: 1 },
    ],
    points: [[-10, 0, 0], [0, 0, 10], [10, 0, -10], [-10, -20, 0], [0, -20, 10], [10, -20, -10]],
  };
};

const withSingleColor = (triangle, color) => {
  return {
    ...triangle,
    colors: undefined,
    color,
  };
};

const Example = ({ triangles }) => (
  <Container cameraState={{ perspective: true, phi: 1.83, thetaOffset: -1.1 }}>
    <Triangles>{triangles}</Triangles>
  </Container>
);

storiesOf("Worldview/Triangles", module)
  .addDecorator(withKnobs)
  .add("<Triangles> with points and color", () => <Example triangles={[singleTriangle(0, 0, 0)]} />)
  .add("<Triangles> with instancing", () => <Example triangles={[instancedTriangles(0, 0, 0)]} />)
  .add("<Triangles> with single color", () => (
    <Example
      triangles={[
        withSingleColor(singleTriangle(0, 0, 0), { r: 1, g: 1, b: 0, a: 1 }),
        withSingleColor(singleTriangle(5.0, 0.1, 0), { r: 0, g: 1, b: 1, a: 1 }),
      ]}
    />
  ))
  .add("<Triangles> with custom depth and blend values", () => (
    <Example triangles={withCustomRenderStates([singleTriangle(0, 0, 0)], [singleTriangle(5, 0, 0.1)])} />
  ))
  .add("<Triangles> with instancing and custom render states", () => (
    <Example triangles={withCustomRenderStates([instancedTriangles(0, 0, 0)], [instancedTriangles(5, 0, 0.1)])} />
  ))
  .add("<Triangles> with single color and custom render states", () => (
    <Example
      triangles={withCustomRenderStates(
        [withSingleColor(singleTriangle(0, 0, 0), { r: 1, g: 1, b: 0, a: 1 })],
        [withSingleColor(singleTriangle(5.0, 0.1, 0), { r: 0, g: 1, b: 1, a: 1 })]
      )}
    />
  ));
