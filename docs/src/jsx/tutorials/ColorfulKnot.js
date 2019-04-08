//  Copyright (c) 118-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Spheres, Axes } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const steps = 500; // total number of objects

  // map a number/index to a specific color
  function numberToColor(number, max, a = 1) {
    const i = (number * 255) / max;
    const r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128) / 255;
    const g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128) / 255;
    const b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128) / 255;
    return { r, g, b, a };
  }

  // the object index needs to be multipled by this scale so it's evenly distributed in the space
  const scale = (Math.PI * 2) / steps;
  const sphereMarkers = new Array(steps)
    .fill()
    .map((_, idx) => [
      // generate x, y, z coordinates based on trefoil equation
      Math.sin(idx * scale) + 2 * Math.sin(2 * idx * scale),
      Math.cos(idx * scale) - 2 * Math.cos(2 * idx * scale),
      -Math.sin(3 * idx * scale),
    ])
    .map(([x, y, z], idx) => ({
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: 20 * x, y: 20 * y, z: 20 * z },
      },
      scale: { x: 1, y: 1, z: 1 },
      color: numberToColor(idx, steps),
    }));

  return (
    <Worldview>
      <Spheres>{sphereMarkers}</Spheres>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE
export default Example;
