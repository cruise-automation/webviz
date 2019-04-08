//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Cubes, Axes, Text } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  return (
    <Worldview>
      <Cubes>
        {[
          {
            pose: {
              orientation: { x: 0, y: 0, z: 0, w: 1 },
              // position the cube at the center
              position: { x: 0, y: 0, z: 0 },
            },
            scale: { x: 10, y: 10, z: 10 },
            // rgba values are between 0 and 1 (inclusive)
            color: { r: 1, g: 0, b: 0, a: 1 },
          },
        ]}
      </Cubes>
      <Axes />
      <Text autoBackgroundColor>
        {[
          {
            text: "Hello, Worldview!",
            color: { r: 1, g: 1, b: 1, a: 1 },
            pose: {
              orientation: { x: 0, y: 0, z: 0, w: 1 },
              position: { x: 0, y: 5, z: 10 },
            },
            scale: { x: 1, y: 1, z: 1 },
          },
        ]}
      </Text>
    </Worldview>
  );
}
// #END EXAMPLE
export default Example;
