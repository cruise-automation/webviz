//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React from "react";
import styled from "styled-components";

import useRange from "./useRange";
import Worldview, { Overlay, Spheres, Axes } from "regl-worldview";

export const StyledContainer = styled.div`
  position: absolute;
  white-space: nowrap;
  z-index: 100;
  pointer-events: none;
  top: 0;
  left: 0;
  will-change: transform;
  padding: 0.8rem;
  background: #99ddff;
  max-width: 240px;
  color: #f7f7f3;
  white-space: pre-line;
  > div {
    position: relative;
    white-space: pre-line;
  }
`;

// #BEGIN EDITABLE
function OverlayDemo() {
  const range = useRange();
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
    text: "Overlay on top of Sphere",
    info: {
      title: `Index:${index}`,
    },
  }));

  return (
    <Worldview>
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
            <StyledContainer
              key={index}
              style={{
                flexDirection: "column",
                transform: `translate(${left.toFixed()}px,${top.toFixed()}px)`,
              }}>
              <h2 style={{ fontSize: "2rem" }}>{title}</h2>
              <div>{text}</div>
              <a
                style={{ pointerEvents: "visible", color: "#f1f1f1" }}
                href="http://www.google.com"
                target="_blank"
                rel="noopener noreferrer">
                A custom link
              </a>
              <div>range: {range.toFixed(2)}</div>
            </StyledContainer>
          );
        }}>
        {textMarkers}
      </Overlay>
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default OverlayDemo;
