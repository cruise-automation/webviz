//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from 'react';
import Worldview, { Cubes, Spheres, DEFAULT_CAMERA_STATE } from 'regl-worldview';
import { p, q, buildMatrix } from './utils';
import useRange from './useRange';

// #BEGIN EXAMPLE
function DynamicCommandsDemo() {
  const range = useRange();
  const [cubeCount, setCubeCount] = useState(3);
  const arr = new Array(cubeCount).fill(0).map((n, idx) => idx);

  return (
    <div style={{ height: 500 }}>
      <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
        <div
          style={{
            position: 'absolute',
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
                  orientation: {
                    x: 0.038269,
                    y: -0.01677,
                    z: -0.8394,
                    w: 0.541905,
                  },
                  position: { x: 5 * id, y: 5 * id, z: 5 * id },
                },
                scale: p(5, 5),
                color: { r: 1, g: 0, b: 0, a: 1 },
              },
            ]}
          </Cubes>
        ))}
        {cubeCount < 3 ? null : (
          <Spheres>
            {[
              {
                points: buildMatrix(20, 20, 20, 10),
                scale: p(0.25 * (1 + range)),
                color: { r: 1, g: range, b: 1, a: 1 },
                pose: {
                  position: p(3 + range),
                  orientation: q(0),
                },
              },
            ]}
          </Spheres>
        )}
      </Worldview>
    </div>
  );
}
// #BEGIN EXAMPLE

export default DynamicCommandsDemo;
