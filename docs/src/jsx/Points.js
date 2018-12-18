//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import useRange from "./useRange";
import { buildMatrix, p, q } from "./utils";
import Worldview, { Points, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
function PointsDemo() {
  const range = useRange();
  const cloud = buildMatrix(3 + range * 2, 3 + range * 2, 3 + range * 2);
  const marker = {
    points: cloud,
    scale: p(1 * (3 * range)),
    color: { r: 1, g: range, b: 1, a: 1 },
    pose: {
      position: p(3 + range),
      orientation: q(0),
    },
  };

  return (
    <Worldview
      defaultCameraState={{
        ...DEFAULT_CAMERA_STATE,
        perspective: true,
        distance: 20,
        targetOffset: [6, 10, 0],
      }}
      hideDebug={true}>
      <Points>{[marker]}</Points>
    </Worldview>
  );
}
// #END EXAMPLE

export default PointsDemo;
