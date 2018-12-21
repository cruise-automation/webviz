//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import Worldview, { Cubes } from "regl-worldview";

// #BEGIN EXAMPLE
function CubesDemo() {
  const markers = [
    {
      pose: {
        orientation: { x: 0, y: 0, z: 0.5, w: 1 },
        position: { x: 0.5, y: 0.5, z: 0.5 },
      },
      scale: { x: 5, y: 5, z: 5 },
      color: { r: 1, g: 0, b: 1, a: 0.5 },
    },
  ];

  return (
    <Worldview>
      <Cubes>{markers}</Cubes>
    </Worldview>
  );
}
// #END EXAMPLE

export default CubesDemo;
