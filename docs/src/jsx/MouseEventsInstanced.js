//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";

import Worldview, { Axes, Spheres } from "regl-worldview";

// #BEGIN EDITABLE
function Example() {
  const [commandMsg, setCommandMsg] = useState("");

  function numberToColor(number, max, a = 1) {
    const i = (number * 255) / max;
    const r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128) / 255;
    const g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128) / 255;
    const b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128) / 255;
    return { r, g, b, a };
  }

  const points = [];
  const step = 5;
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      for (let k = 0; k < 10; k++) {
        points.push({ x: i * step, y: j * step, z: k * step });
      }
    }
  }

  const markerMatrix = {
    // Unique identifier for the object that contains multiple instances.
    // If an object starts with 1000 and has 500 colors, the returned objectId
    // will be in the range of 1000 ~ 1499
    id: 1000,
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 1, y: 1, z: 1 },
    colors: points.map((_, idx) => numberToColor(idx, points.length)),
    points,
  };

  function onSphereClick(ev, { objectId, object }) {
    let msg = "";
    // use the objectId to find the particular object that's been clicked
    if (object && object.points && objectId) {
      const idx = objectId - object.id;
      if (idx >= 0 && idx <= points.length) {
        msg = `Clicked objectId is ${objectId} and position is ${JSON.stringify(markerMatrix.points[idx])}`;
      }
    }
    setCommandMsg(msg);
  }

  function onWorldviewClick(ev, { objectId }) {
    if (!objectId) {
      setCommandMsg("");
    }
  }

  return (
    <Worldview onClick={onWorldviewClick}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 320,
          maxWidth: "100%",
          background: "rgba(255, 255, 255, 0.66)",
        }}>
        {commandMsg ? <span style={{ color: "green" }}>{commandMsg}</span> : <span>Click any sphere</span>}
      </div>
      <Spheres getHitmapId={(marker, idx) => marker.id + idx} onClick={onSphereClick}>
        {[markerMatrix]}
      </Spheres>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE
export default Example;
