//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Lines } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const points = [
    { x: -812.2277333190451, y: 2961.4633761946707, z: 0 },
    { x: -812.2718382693613, y: 2960.8755785794347, z: 0 },
    { x: -812.3047227216128, y: 2960.4388610900487, z: 0 },
    { x: -812.3249921796464, y: 2960.128621087491, z: 0 },
    { x: -812.3386504915552, y: 2959.9166965937397, z: 0 },
    { x: -812.3474835309406, y: 2959.779641779605, z: 0 },
    { x: -812.3526775112591, y: 2959.699051172442, z: 0 },
    { x: -812.3552507121985, y: 2959.6591249861, z: 0 },
    { x: -812.3561798454938, y: 2959.644708409252, z: 0 },
    { x: -812.3563502479498, y: 2959.6420644182203, z: 0 },
    { x: -812.3563594592313, y: 2959.6419214945413, z: 0 },
    { x: -812.3563605869005, y: 2959.641903997451, z: 0 },
    { x: -812.3563606674282, y: 2959.6419027479683, z: 0 },
    { x: -812.3563610277726, y: 2959.6418971568114, z: 0 },
    { x: -812.3563612249804, y: 2959.641894096902, z: 0 },
    { x: -812.3563613255686, y: 2959.641892536161, z: 0 },
    { x: -812.3726781860942, y: 2959.3887175882182, z: 0 },
    { x: -812.4113489277303, y: 2958.368466516476, z: 0 },
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
        perspective: false,
        target: [-812, 2959.64, 0],
        distance: 5,
      }}>
      <Lines>{markers}</Lines>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
