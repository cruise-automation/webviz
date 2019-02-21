//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";

import Worldview, { Axes, Points, Spheres } from "regl-worldview";

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
  const spheresPoints = [];
  const step = 5;
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      for (let k = 0; k < 10; k++) {
        points.push({ x: i * step, y: j * step, z: k * step });
        spheresPoints.push({ x: i * step - 50, y: j * step, z: k * step });
      }
    }
  }

  const pointsMarker = {
    // Unique identifier for the object that contains multiple instances.
    // If an object starts with 1000 and has 500 colors, the returned objectId
    // will be in the range of 1000 ~ 1499
    id: 1000,
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 10, y: 10, z: 10 },
    colors: points.map((_, idx) => numberToColor(idx, points.length)),
    points,
    isSphere: false,
  };

  const spheresMarker = {
    id: 6000,
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 2, y: 2, z: 2 },
    colors: points.map((_, idx) => numberToColor(idx, points.length)),
    points: spheresPoints,
    isSphere: true,
  };

  function onObjectClick(ev, { objectId, object }) {
    let msg = "";
    // use the objectId to find the particular object that's been clicked
    if (object && object.points && objectId) {
      // spheres has reverse id, from 6000 to 5001
      const idx = object.isSphere ? object.id - objectId : objectId - object.id;
      const objectName = object.isSphere ? "Sphere" : "Point";
      if (idx >= 0 && idx <= points.length) {
        msg = `${objectName} clicked. The objectId is ${objectId} and its position is ${JSON.stringify(
          pointsMarker.points[idx]
        )}`;
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
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}>
        {commandMsg ? <span>{commandMsg}</span> : <span>Click any object</span>}
      </div>
      <Points enableInstanceHitmap onClick={onObjectClick}>
        {[pointsMarker]}
      </Points>
      <Spheres
        enableInstanceHitmap
        getHitmapId={(marker, pointIdx) => marker.id - pointIdx}
        testObjectIdInRange={(objectId, hitmapProp) =>
          objectId <= hitmapProp.id && objectId > hitmapProp.id - points.length
        }
        onClick={onObjectClick}>
        {[spheresMarker]}
      </Spheres>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE
export default Example;
