//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Cubes, Axes, Lines } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const cubeMarkers = [
    {
      depth: {
        enable: true,
        mask: true,
      },
      blend: {
        enable: true,
        func: {
          srcRGB: "src alpha",
          srcAlpha: 1,
          dstRGB: "one minus src alpha",
          dstAlpha: 1,
        },
      },
      pose: {
        orientation: { x: -0.615, y: 0, z: -0.789, w: 0 },
        position: { x: 10, y: 10, z: 10 },
      },
      scale: { x: 10, y: 10, z: 10 },
      color: { r: 0, g: 1, b: 1, a: 0.8 },
    },
    {
      depth: {
        enable: true,
        mask: true,
      },
      blend: {
        enable: false,
        func: {
          srcRGB: "src alpha",
          srcAlpha: 1,
          dstRGB: "one minus src alpha",
          dstAlpha: 1,
        },
      },
      pose: {
        orientation: { x: -0.615, y: 0, z: -0.789, w: 0 },
        position: { x: 5, y: 6, z: 0 },
      },
      scale: { x: 10, y: 10, z: 10 },
      color: { r: 1, g: 0, b: 1, a: 0.5 },
    },
  ];

  function cubesToLines(markers) {
    return markers.map(({ pose, pose: { position }, scale }) => {
      const p0 = [-scale.x / 2, -scale.y / 2, -scale.z / 2];
      const p1 = [scale.x / 2, -scale.y / 2, -scale.z / 2];
      const p2 = [scale.x / 2, scale.y / 2, -scale.z / 2];
      const p3 = [-scale.x / 2, scale.y / 2, -scale.z / 2];
      const p4 = [-scale.x / 2, -scale.y / 2, scale.z / 2];
      const p5 = [scale.x / 2, -scale.y / 2, scale.z / 2];
      const p6 = [scale.x / 2, scale.y / 2, scale.z / 2];
      const p7 = [-scale.x / 2, scale.y / 2, scale.z / 2];

      return {
        pose,
        primitive: "lines",
        scale: { x: 0.2, y: 0.2, z: 0.2 },
        points: [
          // bottom
          p0,
          p1,
          p1,
          p2,
          p2,
          p3,
          p3,
          p0,
          // top
          p4,
          p5,
          p5,
          p6,
          p6,
          p7,
          p7,
          p4,
          // around
          p0,
          p4,
          p1,
          p5,
          p2,
          p6,
          p3,
          p7,
        ],
        color: { r: 1, g: 1, b: 0, a: 1 },
      };
    });
  }
  const lineMarkers = cubesToLines(cubeMarkers);

  return (
    <Worldview>
      <Cubes>{cubeMarkers}</Cubes>
      <Lines>{lineMarkers}</Lines>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE
export default Example;
