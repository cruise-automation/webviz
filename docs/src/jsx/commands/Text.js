//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState, useCallback } from "react";
import Worldview, { Text2, Axes, Cubes, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const [text, setText] = useState("Hello\nWorldview!");

  const labelMarker = {
    text,
    // color: { r: 1, g: 1, b: 1, a: 1 },
    colors: [{ r: 0.5, g: 0.5, b: 0.5, a: 1 }, { r: 1, g: 1, b: 1, a: 1 }],
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 1, y: 1, z: 1 },
    },
    scale: { x: 1, y: 1, z: 1 },
    // uncomment colors and remove autoBackgroundColor prop to set text and background colors
    // colors: [{ r: 1, g: 1, b: 1, a: 1 }, { r: 1, g: 0, b: 0, a: 0.8 }],
  };

  const cubeMarker1 = {
    color: { r: 1, g: 0.5, b: 0, a: 0.5 },
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 1, y: 1, z: 1 },
    },
    scale: { x: 1, y: 1, z: 1 },
  };

  const cubeMarker2 = {
    color: { r: 0, g: 1, b: 0, a: 1 },
    pose: labelMarker.pose,
    scale: { x: 0.1, y: 0.1, z: 0.1 },
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}>
      <textarea
        style={{ width: "100%", height: "30%" }}
        value={text}
        onChange={useCallback((e) => setText(e.target.value))}
      />
      <div style={{ height: "70%" }}>
        <Worldview
          defaultCameraState={{
            ...DEFAULT_CAMERA_STATE,
            targetOffset: [2, 1.5, 0],
            distance: 10,
            phi: 0,
          }}>
          <Text2 autoBackgroundColor>{[labelMarker]}</Text2>
          <Cubes>{[cubeMarker2]}</Cubes>
          <Axes />
        </Worldview>
      </div>
    </div>
  );
}
// #END EXAMPLE

export default Example;
