//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import range from "lodash/range";
import React from "react";
import Worldview, { Triangles, DEFAULT_CAMERA_STATE } from "regl-worldview";
import seedrandom from "seedrandom";

import { seed } from "./constants";
import { p, q } from "./utils";

// #BEGIN EXAMPLE
function TrianglesDemo() {
  const rng = seedrandom(seed);
  const vertexColors = range(30).map((_, i) => ({
    r: rng(),
    g: rng(),
    b: rng(),
    a: 1,
  }));

  const colors = [];
  const points = [];
  for (let i = 0; i < 10; i++) {
    points.push([5 * i, 0, 0]);
    points.push([5 * i, 5, 0]);
    points.push([5 * i + 5, 5, 0]);
    colors.push(vertexColors[3 * i], vertexColors[3 * i + 1], vertexColors[3 * i + 2]);
  }
  const marker = {
    pose: {
      position: p(0),
      orientation: q(0),
    },
    points,
    colors,
  };

  return (
    <div style={{ height: 500 }}>
      <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
        <Triangles>{[marker]}</Triangles>
      </Worldview>
    </div>
  );
}
// #END EXAMPLE

export default TrianglesDemo;
