//  Copyright (c) 118-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import { useAnimationFrame } from "@cruise-automation/hooks";
import { quat, vec3 } from "gl-matrix";
import React, { useState } from "react";
import Worldview, { Spheres, Axes, GLTFScene } from "regl-worldview";

import duckModel from "common/fixtures/Duck.glb"; // Webpack magic: we actually import a URL pointing to a .glb file

// #BEGIN EDITABLE
function Example() {
  const steps = 500; // total amount of objects
  const [count, setCount] = useState(0);
  useAnimationFrame(
    () => {
      // update count before each browser repaint
      const newCount = (count + 1) % steps;
      setCount(newCount);
    },
    false,
    []
  );

  // map a number/index to a specific color
  function numberToColor(number, max, a = 1) {
    const i = (number * 255) / max;
    const r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128) / 255;
    const g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128) / 255;
    const b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128) / 255;
    return { r, g, b, a };
  }

  // the object index needs to multiple by this scale so it's evenly distributed in the space
  const scale = (Math.PI * 2) / steps;
  const sphereMarker = {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 1, y: 1, z: 1 },
    colors: [],
    points: [],
  };

  new Array(steps)
    .fill()
    .map((_, idx) => [
      // generate x, y, z coordinates based on trefoil equation
      Math.sin(idx * scale) + 2 * Math.sin(2 * idx * scale),
      Math.cos(idx * scale) - 2 * Math.cos(2 * idx * scale),
      -Math.sin(3 * idx * scale),
    ])
    .forEach(([x, y, z], idx) => {
      // add individual point and color to the single sphere object
      sphereMarker.colors.push(numberToColor(idx, steps));
      sphereMarker.points.push({ x: x * 20, y: y * 20, z: z * 20 });
    });
  const duckPosition = sphereMarker.points[count];

  // get the orientation for the duck so its moving direction is always aligned with the knot
  const tangentVecO = [
    Math.cos(count * scale) + 4 * Math.cos(2 * count * scale),
    -Math.sin(count * scale) + 4 * Math.sin(2 * count * scale),
    -3 * Math.cos(3 * count * scale),
  ];
  const tangentVec = vec3.normalize([0, 0, 0], tangentVecO);
  const duckYaw = quat.setAxisAngle([0, 0, 0, 0], [0, 0, 1], Math.atan2(tangentVec[1], tangentVec[0]));
  const duckOrientation = [0, 0, 0, 1];
  quat.multiply(duckOrientation, duckOrientation, duckYaw);
  quat.rotateY(
    duckOrientation,
    duckOrientation,
    -Math.atan(tangentVecO[2] / Math.hypot(tangentVecO[0], tangentVecO[1]))
  );
  quat.rotateZ(duckOrientation, duckOrientation, -Math.PI / 2);

  return (
    <Worldview
      cameraState={{
        target: [duckPosition.x, duckPosition.y, duckPosition.z],
        // This is the magic! The `targetOrientation` input will make sure the camera follows the duck's orientation
        targetOrientation: duckOrientation,
        // zoom out a little so we can see better
        distance: 160,
        thetaOffset: -Math.PI / 2, // rotate the camera so the duck is facing right
      }}>
      <Spheres>{[sphereMarker]}</Spheres>
      <Axes />
      {/* Download model: https://github.com/cruise-automation/webviz/blob/master/common/fixtures/Duck.glb  */}
      <GLTFScene model={duckModel}>
        {{
          pose: {
            position: duckPosition,
            orientation: { x: duckOrientation[0], y: duckOrientation[1], z: duckOrientation[2], w: duckOrientation[3] },
          },
          scale: { x: 3, y: 3, z: 3 },
        }}
      </GLTFScene>
    </Worldview>
  );
}
// #END EXAMPLE
export default Example;
