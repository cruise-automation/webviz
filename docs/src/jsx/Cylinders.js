//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";

import useRange from "./useRange";
import { p } from "./utils";
import Worldview, { Cylinders, Axes, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
function CylindersDemo() {
  const range = useRange();
  const [scaleX] = useState(3);
  const [scaleY] = useState(3);
  const [scaleZ] = useState(10);
  const marker = {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: p(scaleX, scaleY, scaleZ),
    color: { r: 1 - range * 0.5, g: range, b: 1, a: 1 - range * 0.3 },
  };

  return (
    <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }} hideDebug={true}>
      <Cylinders>{[marker]}</Cylinders>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default CylindersDemo;
