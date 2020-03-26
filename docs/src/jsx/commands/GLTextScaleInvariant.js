//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import { quat } from "gl-matrix";
import React, { useState } from "react";
import Worldview, { GLText, Grid, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EDITABLE
const RADIUS = 20; // distance from the origin for placing columns
const FONT_SIZE = 20; // font size for scale invariant property

const vec4ToOrientation = ([x, y, z, w]) => ({ x, y, z, w });

// Build a set of markers with different sizes and poses
function textMarkers(text) {
  const radius = 7;
  const count = 5;
  return new Array(count).fill().map((_, i) => {
    const angle = (2 * Math.PI * i) / count;
    const color = { r: (i + 1) / count, g: (i + 1) / count, b: 0, a: 1 };
    return {
      text,
      pose: {
        position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 },
        orientation: vec4ToOrientation(quat.rotateZ(quat.create(), quat.create(), Math.PI / 2 + angle)),
      },
      scale: { x: 1 + i / count, y: 1 + i / count, z: 1 + i / count },
      color,
      billboard: true,
    };
  });
}

// Build a marker at the center of the world
// Since the billboard property is set to false, scale
// invariance cannot be used for this marker.
function nonBillboardTextMarkers(text) {
  return [
    {
      text,
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 1, g: 1, b: 1, a: 1 },
      billboard: false,
    },
  ];
}

function Example() {
  const markers = textMarkers("Scale\nInvariant");
  const centerMarker = nonBillboardTextMarkers("This text is\nnot a Billboard");
  const [cameraState, setCameraState] = useState({
    ...DEFAULT_CAMERA_STATE,
    distance: RADIUS * 2,
  });
  return (
    <Worldview
      cameraState={cameraState}
      onCameraStateChange={(newState) =>
        setCameraState((oldState) => ({
          ...oldState,
          ...newState,
          targetOffset: oldState.targetOffset,
          phi: oldState.phi,
        }))
      }>
      <GLText scaleInvariantFontSize={FONT_SIZE}>{markers}</GLText>
      <GLText>{centerMarker}</GLText>
      <Grid count={10} />
    </Worldview>
  );
}

// #DOCS ONLY: render(<Example />);

// #END EXAMPLE

export default Example;
