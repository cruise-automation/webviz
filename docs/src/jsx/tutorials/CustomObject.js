//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Cubes, Axes } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const [count, setCount] = useState(1);
  const markers = new Array(count).fill().map((_, idx) => {
    return {
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        // change cube's position along x axis
        position: { x: idx * idx, y: 0, z: 0 },
      },
      scale: { x: idx + 1, y: idx + 1, z: idx + 1 },
      // set cube to a random color
      color: { r: Math.random(), g: Math.random(), b: Math.random(), a: 1 },
    };
  });

  return (
    <Worldview>
      <button style={{ position: "absolute", top: 0, left: 0 }} onClick={() => setCount(count + 1)}>
        Add a Cube
      </button>
      <Cubes>{markers}</Cubes>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE
export default Example;
