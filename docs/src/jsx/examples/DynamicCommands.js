//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Cubes, Spheres, Axes } from "regl-worldview";

import useRange from "../utils/useRange";

// #BEGIN EDITABLE
function Example() {
  const range = useRange();
  const [cubeCount, setCubeCount] = useState(3);
  const arr = new Array(cubeCount).fill(0).map((n, idx) => idx);

  // create coordinates
  const x = 20;
  const y = 20;
  const z = 20;
  const step = 10;
  const sphereCoords = [];
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < z; k++) {
        sphereCoords.push({ x: i * step, y: j * step, z: k * step });
      }
    }
  }

  const sphereScaleX = 0.25 * (1 + range);
  const spherePosX = 3 + range;

  return (
    <Worldview>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          padding: 10,
        }}>
        <button onClick={() => setCubeCount(cubeCount + 1)}>Add cube</button>
        <button onClick={() => setCubeCount(cubeCount - 1)}>Remove cube</button>
      </div>
      {arr.map((id) => (
        <Cubes key={id}>
          {[
            {
              id,
              pose: {
                orientation: { x: 0, y: 0, z: 0, w: 1 },
                position: { x: 5 * id, y: 5 * id, z: 5 * id },
              },
              scale: { x: 5, y: 5, z: 5 },
              color: { r: 1, g: 0, b: 0, a: 1 },
            },
          ]}
        </Cubes>
      ))}
      {cubeCount < 3 ? null : (
        <Spheres>
          {[
            {
              points: sphereCoords,
              scale: { x: sphereScaleX, y: sphereScaleX, z: sphereScaleX },
              color: { r: 1, g: range, b: 1, a: 1 },
              pose: {
                position: { x: spherePosX, y: spherePosX, z: spherePosX },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
              },
            },
          ]}
        </Spheres>
      )}
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
