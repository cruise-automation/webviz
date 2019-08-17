//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Axes, Cubes, intToRGB, Points, Spheres, Triangles } from "regl-worldview";

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
    info: "an instanced point",
  };

  const instancedSphereMarker = {
    id: 6000,
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 2, y: 2, z: 2 },
    colors: points.map((_, idx) => numberToColor(idx, points.length)),
    points: spheresPoints,
    info: "an instanced sphere",
    hasCustomHitmapProps: true, // with customGetHitmapProps and customGetObjectFromHitmapId
  };

  function onObjectClick(ev, { objectId, object }) {
    let msg = "";
    // use the objectId to find the particular object that's been clicked
    if (object && objectId) {
      if (object.points) {
        // instanced spheres has reverse id, from 6000 to 5001
        const idx = object.hasCustomHitmapProps ? object.id - objectId : objectId - object.id;
        if (idx >= 0 && idx <= points.length) {
          msg = `Clicked ${object.info}. The objectId is ${objectId} and its position is ${JSON.stringify(
            object.points[idx]
          )}`;
        }
      } else {
        msg = `Clicked ${object.info}. The objectId is ${objectId} and its position is ${JSON.stringify(
          object.pose.position
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

  function customGetHitmapProps(children) {
    return children.map((marker) => ({
      ...marker,
      colors: marker.points.map((_, pointIndex) => intToRGB(marker.id - pointIndex)),
    }));
  }

  function customGetObjectFromHitmapId(objectId, hitmapProps) {
    return hitmapProps.find((hitmapProp) => {
      if (hitmapProp.points && objectId <= hitmapProp.id && objectId > hitmapProp.id - hitmapProp.points.length) {
        return true;
      }
      return false;
    });
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
      <Points onClick={onObjectClick}>{[pointsMarker]}</Points>
      <Spheres
        getHitmapProps={customGetHitmapProps}
        getObjectFromHitmapId={customGetObjectFromHitmapId}
        onClick={onObjectClick}>
        {[instancedSphereMarker]}
      </Spheres>
      <Points onClick={onObjectClick}>
        {[
          {
            id: 10001,
            pose: {
              orientation: { x: 0, y: 0, z: 0, w: 1 },
              position: { x: 0, y: 0, z: 0 },
            },
            points: [{ x: 10, y: -10, z: 0 }],
            color: { r: 1, g: 0, b: 0, a: 1 },
            scale: { x: 20, y: 20, z: 20 },
            info: "a point",
          },
        ]}
      </Points>
      <Cubes onClick={onObjectClick}>
        {[
          {
            id: 20001,
            pose: {
              orientation: { x: 0, y: 0, z: 0, w: 1 },
              position: { x: 0, y: -10, z: 0 },
            },
            color: { r: 1, g: 0, b: 0, a: 1 },
            scale: { x: 4, y: 4, z: 4 },
            info: "a cube",
          },
        ]}
      </Cubes>
      <Spheres getHitmapId={(marker) => marker.myId} onClick={onObjectClick}>
        {[
          {
            myId: 30001,
            pose: {
              orientation: { x: 0, y: 0, z: 0, w: 1 },
              position: { x: -10, y: -10, z: 0 },
            },
            color: { r: 1, g: 0, b: 0, a: 1 },
            scale: { x: 4, y: 4, z: 4 },
            info: `a sphere with deprecated api "getHitmapId"`,
          },
        ]}
      </Spheres>
      <Triangles onClick={onObjectClick}>
        {[
          {
            id: 40001,
            pose: pointsMarker.pose,
            points: [[-20, -10, 0], [-20, -5, 0], [-15, -10, 0], [-15, -5, 0], [-15, -10, 0], [-10, -5, 0]],
            colors: pointsMarker.colors.slice(6),
            info: "one point in a triangle",
          },
        ]}
      </Triangles>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE
export default Example;
