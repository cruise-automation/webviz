//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import Worldview, { Spheres, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
function BasicExample() {
  const markers = [
    {
      pose: {
        orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
        position: { x: 0, y: 0, z: 0 },
      },
      scale: { x: 5, y: 5, z: 5 },
      color: { r: 1, g: 0, b: 1, a: 0.9 },
    },
  ];

  return (
    <div
      style={{
        height: 500,
        width: "100%",
      }}>
      <Worldview defaultCameraState={DEFAULT_CAMERA_STATE}>
        <Spheres>{markers}</Spheres>
      </Worldview>
    </div>
  );
}
// #END EXAMPLE
export default BasicExample;
