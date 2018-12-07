//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from 'react';
import Worldview, { Overlay, Spheres, DEFAULT_CAMERA_STATE } from 'regl-worldview';
import { StyledContainer } from './WorldviewCodeEditor';
import useRange from './useRange';

// #BEGIN EXAMPLE
function OverlayDemo() {
  const range = useRange();
  const marker = {
    pose: {
      orientation: { x: 0.038269, y: -0.01677, z: -0.8394, w: 0.541905 },
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
    text: 'Overlay on top of Sphere',
    info: {
      title: 'Index:' + index,
    },
  }));

  return (
    <div style={{ height: 500 }}>
      <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
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
                  transform: `translate(${left.toFixed()}px,${top.toFixed()}px)`,
                }}>
                <h2 style={{ fontSize: '2rem' }}>{title}</h2>
                <div>{text}</div>
                <a
                  style={{ pointerEvents: 'visible', color: '#f1f1f1' }}
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
      </Worldview>
    </div>
  );
}
// #END EXAMPLE
export default OverlayDemo;
