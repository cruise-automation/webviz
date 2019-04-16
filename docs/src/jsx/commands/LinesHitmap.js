//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Lines, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const [clickedObj, setClickedObj] = useState(null);
  const [clickedObjId, setClickedObjId] = useState(null);
  // map a number/index to a specific color
  function numberToColor(number, max, a = 1) {
    const i = (number * 255) / max;
    const r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128) / 255;
    const g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128) / 255;
    const b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128) / 255;
    return { r, g, b, a };
  }
  const points = [
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 3, z: 1 },
    { x: 3, y: 3, z: 1 },
    { x: 3, y: 0, z: 1 },

    // { x: 0, y: -3, z: 1 },
    // { x: 0, y: -3, z: 0 },

    // { x: 1, y: -2, z: 1 },
    // { x: 1, y: -2, z: 0 },
  ];
  const lines = [
    {
      id: 191,
      closed: true,
      primitive: "line strip",
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 0 },
      },
      scale: { x: 0.1, y: 0.1, z: 0.1 },
      color: { r: 0, g: 1, b: 0, a: 1 },
      points,
      colors: points.map((x, idx) => numberToColor(idx, points.length)),
    },
  ];

  return (
    <Worldview
      onClick={(ev, { objectId }) => {
        setClickedObjId(objectId);
        if (!objectId) {
          setClickedObj(null);
        }
      }}
      defaultCameraState={{ ...DEFAULT_CAMERA_STATE, distance: 10 }}>
      <Lines
        onClick={(ev, { object, objectId }) => {
          setClickedObj(object);
        }}>
        {lines}
      </Lines>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 320,
          maxWidth: "100%",
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}>
        {clickedObj ? <span>Clicked line point id: {clickedObjId} </span> : <span>Click on any lines</span>}
      </div>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
