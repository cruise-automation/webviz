//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import Worldview, { Cubes, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
class CubesDemo extends React.Component {
  render() {
    const markers = [
      {
        pose: {
          orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
          position: { x: 0.5, y: 0.5, z: 0.5 },
        },
        scale: { x: 5, y: 5, z: 5 },
        color: { r: 1, g: 0, b: 1, a: 1 },
      },
    ];

    return (
      <div style={{ height: 500 }}>
        <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
          <Cubes>{markers}</Cubes>
        </Worldview>
      </div>
    );
  }
}
// #END EXAMPLE

export default CubesDemo;
