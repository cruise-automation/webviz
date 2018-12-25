//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import Worldview, { Lines, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
function LinesInstabilityDemo() {
  const points = [
    { x: 812, y: 2961, z: 0 },
    { x: 812, y: 2960, z: 0 },
    { x: 812, y: 2960, z: 0 },
    { x: 812, y: 2960, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2959, z: 0 },
    { x: 812, y: 2958, z: 0 },
  ];
  const pose = {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };

  const markers = [
    {
      primitive: "line strip",
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 1, g: 0, b: 1, a: 1 },
      pose,
      points,
      debug: true,
    },
  ];

  return (
    <Worldview
      defaultCameraState={{
        ...DEFAULT_CAMERA_STATE,
        perspective: false,
        target: [-812, 2959, 0],
        distance: 5,
      }}>
      <Lines>{markers}</Lines>
    </Worldview>
  );
}
// #END EXAMPLE

export default LinesInstabilityDemo;
