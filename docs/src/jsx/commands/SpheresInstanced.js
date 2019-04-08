//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Spheres } from "regl-worldview";

import useRange from "../utils/useRange";

// #BEGIN EDITABLE
function Example() {
  const range = useRange();
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
  // create sphere list
  const scaleX = 0.25 * (1 + range);
  const sphereList = {
    points: coords,
    scale: { x: scaleX, y: scaleX, z: scaleX },
    color: { r: 1, g: range, b: 1, a: 1 },
    pose: {
      position: { x: range, y: range, z: range },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
  };

  return (
    <Worldview>
      <Spheres>{[sphereList]}</Spheres>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
