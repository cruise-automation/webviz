//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Arrows, Axes } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const poseArrow = {
    pose: {
      orientation: { x: 0, y: 0, z: -1, w: 0.5 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 20, y: 3, z: 3 },
    color: { r: 1, g: 0, b: 1, a: 1 },
  };
  const pointArrow = {
    color: { r: 1, g: 1, b: 1, a: 1 },
    points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }],
    scale: { x: 2, y: 2, z: 3 },
  };

  return (
    <Worldview>
      <Arrows>{[poseArrow, pointArrow]}</Arrows>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
