//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Axes, Overlay, Spheres } from "regl-worldview";

import useRange from "../utils/useRange";

// #BEGIN EDITABLE
function Example() {
  const range = useRange();
  const [overflowVisible, setOverflowVisible] = useState(false);
  const marker = {
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
    },
    scale: { x: 5, y: 5, z: 5 },
    color: { r: 1, g: 0, b: 1, a: 1 - range },
  };
  const sphereMarkers = [
    marker,
    {
      ...marker,
      pose: { ...marker.pose, position: { x: 10, y: 10, z: 10 } },
      color: { r: 1, g: 0, b: 1, a: range },
    },
  ];

  const textMarkers = sphereMarkers.map((sphere, index) => ({
    pose: sphere.pose,
    text: "overlay on top of Sphere",
    info: {
      title: `index: ${index}`,
    },
  }));

  return (
    <div style={{ width: 400, height: 400, margin: 20, background: "#1e1e27", display: "block", position: "relative" }}>
      <button style={{ position: "absolute", zIndex: 10001 }} onClick={() => setOverflowVisible(!overflowVisible)}>
        {overflowVisible ? "Overflow visible" : "Overflow clipped"}
      </button>
      <Worldview style={{ width: 360, height: 320, overflow: overflowVisible ? "visible" : "hidden" }}>
        <Spheres>{sphereMarkers}</Spheres>
        <Overlay
          renderItem={({ item, coordinates, index, dimension: { width, height } }) => {
            if (!coordinates) {
              return null;
            }
            const [left, top] = coordinates;
            if (left < -10 || top < -10 || left > width + 10 || top > height + 10) {
              return null; // Don't render anything that's too far outside of the canvas
            }
            const {
              text,
              info: { title },
            } = item;
            return (
              <div
                key={index}
                style={{
                  transform: `translate(${left.toFixed()}px,${top.toFixed()}px)`,
                  flexDirection: "column",
                  position: "absolute",
                  background: "rgba(0, 0, 0, 0.8)",
                  color: "white",
                  maxWidth: 250,
                  pointerEvents: "none", // enable clicking the objects underneath
                  willChange: "transform",
                  fontSize: 12,
                  padding: 8,
                  whiteSpace: "pre-line",
                  top: 0,
                  left: 0,
                }}>
                <div>{title}</div>
                <div>{text}</div>
                <a
                  style={{ pointerEvents: "visible" }}
                  href="http://www.getcruise.com"
                  target="_blank"
                  rel="noopener noreferrer">
                  custom link
                </a>
                <div>range: {range.toFixed(2)}</div>
              </div>
            );
          }}>
          {textMarkers}
        </Overlay>
        <Axes />
      </Worldview>
    </div>
  );
}
// #END EXAMPLE

export default Example;
