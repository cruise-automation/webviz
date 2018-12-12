//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import polygonGenerator from "polygon-generator";
import React from "react";
import Worldview, { FilledPolygons, DEFAULT_CAMERA_STATE } from "regl-worldview";

import useRange from "./useRange";

// #BEGIN EXAMPLE
function FilledPolygonsDemo() {
  const range = useRange();
  const sideLength = 5 * range + 5;
  const startingAngle = 15 * range;
  const numSides = Math.floor(range * 15) + 1;
  const randomPolygon = polygonGenerator.coordinates(numSides, sideLength, startingAngle);
  const vertices = randomPolygon.map(({ x, y }) => [x, y, 0]);
  const polygon = {
    points: vertices,
    color: [1 - range * 0.5, range, 1, 1 - range * 0.3],
    id: 1,
  };
  return (
    <div style={{ height: 500 }}>
      <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
        <FilledPolygons>{[polygon]}</FilledPolygons>
      </Worldview>
    </div>
  );
}
// #END EXAMPLE

export default FilledPolygonsDemo;
