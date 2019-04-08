//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Axes, Cubes } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const markers = [
    {
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: 0, y: 0, z: 0 },
      },
      scale: { x: 10, y: 10, z: 10 },
      color: { r: 1, g: 0, b: 1, a: 0.5 },
    },
  ];

  return (
    <Worldview>
      <Cubes>{markers}</Cubes>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
