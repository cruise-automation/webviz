//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { p } from "./utils";
import Worldview, { Arrows, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
function ArrowsDemo() {
  const poseArrow = {
    pose: {
      orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: p(20, 3, 3),
    color: { r: 1, g: 0, b: 1, a: 1 },
  };
  const pointArrow = {
    color: { r: 1, g: 1, b: 1, a: 1 },
    points: [p(0, 0, 0), p(10, 10, 10)],
    scale: p(2, 2, 3),
  };

  return (
    <div style={{ height: 500 }}>
      <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
        <Arrows>{[poseArrow, pointArrow]}</Arrows>
      </Worldview>
    </div>
  );
}
// #END EXAMPLE

export default ArrowsDemo;
