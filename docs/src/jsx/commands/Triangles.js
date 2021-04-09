//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Triangles, Axes } from "regl-worldview";
import seedrandom from "seedrandom";

// #BEGIN EDITABLE
function Example() {
  const SEED = 123;
  const rng = seedrandom(SEED);
  const vertexColors = new Array(30).fill(0).map((_, i) => ({
    r: rng(),
    g: rng(),
    b: rng(),
    a: 1,
  }));

  const colors = [];
  const points = [];
  for (let i = 0; i < 10; i++) {
    points.push([5 * i - 20, 0, 0]);
    points.push([5 * i - 20, 5, 0]);
    points.push([5 * i - 20 + 5, 5, 0]);
    colors.push(vertexColors[3 * i], vertexColors[3 * i + 1], vertexColors[3 * i + 2]);
  }
  const marker = {
    pose: {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
    points,
    colors,
  };

  return (
    <Worldview>
      <Triangles>{[marker]}</Triangles>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
