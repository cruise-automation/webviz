//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Spheres } from "regl-worldview";
import seedrandom from "seedrandom";

// #BEGIN EDITABLE
function Example() {
  const SEED = 123;
  // create coordinates
  const x = 20;
  const y = 20;
  const z = 20;
  const step = 10;
  const coords = [];
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < z; k++) {
        coords.push({ x: i * step, y: j * step, z: k * step });
      }
    }
  }

  const rng = seedrandom(SEED);
  window.colors =
    window.colors ||
    coords.map((coord, i) => {
      return { r: rng(), g: rng(), b: rng(), a: 1 };
    });

  const marker = {
    points: coords,
    scale: { x: 0.25, y: 0.25, z: 0.25 },
    colors: window.colors,
    pose: {
      position: { x: 3, y: 3, z: 3 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
  };

  return (
    <Worldview
      defaultCameraState={{
        target: [20, 20, 100],
      }}>
      <Spheres>{[marker]}</Spheres>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
