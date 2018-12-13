//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import seedrandom from "seedrandom";

import { seed } from "./constants";
import { buildMatrix, p, q } from "./utils";
import Worldview, { Spheres, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
function SpheresInstanceColorDemo() {
  const coords = buildMatrix(20, 20, 20, 10);
  const rng = seedrandom(seed);
  window.colors =
    window.colors ||
    coords.map((coord, i) => {
      return { r: rng(), g: rng(), b: rng(), a: 1 };
    });

  const marker = {
    points: coords,
    scale: p(0.25),
    colors: window.colors,
    pose: {
      position: p(3),
      orientation: q(0),
    },
  };
  return (
    <div style={{ height: 500 }}>
      <Worldview
        defaultCameraState={{
          ...DEFAULT_CAMERA_STATE,
          perspective: true,
          target: [20, 20, 100],
        }}>
        <Spheres>{[marker]}</Spheres>
      </Worldview>
    </div>
  );
}
// #END EXAMPLE

export default SpheresInstanceColorDemo;
