//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import Worldview, { Axes, Triangles, Text } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const depth = { enable: true, mask: true };
  const labelMarker = {
    name: "randomName",
    text: "STOP",
    color: { r: 1, g: 1, b: 1, a: 1 },
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 5, y: 5, z: 0 },
    },
    scale: { x: 1, y: 1, z: 1 },
  };
  const stopSignWhiteBaseMarker = {
    depth,
    color: { r: 1, g: 1, b: 1, a: 1 },
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: -0.4, z: 0 },
      { x: 1, y: 0.4, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0.4, z: 0 },
      { x: 0.4, y: 1, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0.4, y: 1, z: 0 },
      { x: -0.4, y: 1, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0.4, z: 0 },
      { x: -0.4, y: 1, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: -1, y: -0.4, z: 0 },
      { x: -1, y: 0.4, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: -1, y: -0.4, z: 0 },
      { x: -0.4, y: -1, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0.4, y: -1, z: 0 },
      { x: -0.4, y: -1, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0.4, y: -1, z: 0 },
      { x: 1, y: -0.4, z: 0 },
    ],
    scale: { x: 1, y: 1, z: 1 },
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 5, y: 5, z: 0.02 },
    },
  };

  const stopSignMarker = {
    depth,
    color: { r: 1.0, g: 0.2, b: 0.2, a: 1.0 },
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 0.9, y: -0.37, z: 0 },
      { x: 0.9, y: 0.37, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0.9, y: 0.37, z: 0 },
      { x: 0.37, y: 0.9, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0.37, y: 0.9, z: 0 },
      { x: -0.37, y: 0.9, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: -0.9, y: 0.37, z: 0 },
      { x: -0.37, y: 0.9, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: -0.9, y: -0.37, z: 0 },
      { x: -0.9, y: 0.37, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: -0.9, y: -0.37, z: 0 },
      { x: -0.37, y: -0.9, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0.37, y: -0.9, z: 0 },
      { x: -0.37, y: -0.9, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0.37, y: -0.9, z: 0 },
      { x: 0.9, y: -0.37, z: 0 },
    ],
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 5, y: 5, z: 0.03 },
    },
    scale: { x: 1, y: 1, z: 1 },
  };

  return (
    <Worldview
      defaultCameraState={{
        distance: 12,
        phi: 0.4,
        targetOffset: [2, 3, 0],
        thetaOffset: 0.3,
      }}>
      <Triangles>
        {[
          {
            ...stopSignMarker,
            pose: {
              orientation: { x: 0, y: 0, z: 0, w: 1 },
              position: { x: 5, y: 5, z: 0.01 },
            },
          },
          stopSignWhiteBaseMarker,
          stopSignMarker,
        ]}
      </Triangles>
      <Text>{[labelMarker]}</Text>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
