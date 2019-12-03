// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { Worldview, DEFAULT_CAMERA_STATE } from "regl-worldview";
import { withScreenshot } from "storybook-chrome-screenshot";

import PoseMarkers from "./PoseMarkers";

const MARKER_DATA = {
  header: { seq: 26967, stamp: { sec: 1516929048, nsec: 413347495 }, frame_id: "" },
  pose: {
    position: { x: -1937.7028138723192, y: 1770.5034239982174, z: 52.870026489273044 },
    orientation: { x: 0, y: 0, z: -0.9928242172830276, w: 0.11958291506876588 },
  },
  scale: { x: 1, y: 1, z: 1 },
  color: { r: 1, g: 1, b: 1, a: 0.5 },
  settings: { color: "" },
};
const targetPosition = MARKER_DATA.pose.position;
const targetOffset = [targetPosition.x, targetPosition.y, targetPosition.z];

function Example({ alpha = 0.3, color = "50,150,50,0.3" }: { alpha?: number, color?: string }) {
  const marker = MARKER_DATA;
  const markerWithoutColor = {
    ...MARKER_DATA,
    color: undefined,
    pose: {
      position: { x: -1937.7028138723192, y: 1775.5034239982174, z: 52.870026489273044 },
      orientation: { x: 0, y: 0, z: -0.9928242172830276, w: 0.11958291506876588 },
    },
  };

  const markerWithSettings = {
    ...MARKER_DATA,
    pose: {
      position: { x: -1947.7028138723192, y: 1770.5034239982174, z: 52.870026489273044 },
      orientation: { x: -0.9928242172830276, y: 0, z: 0, w: 0.11958291506876588 },
    },
    settings: {
      color,
      size: {
        shaftWidth: 0.5,
        headWidth: 2,
        headLength: 2,
      },
    },
  };
  const markerWithCarModel = {
    ...MARKER_DATA,
    pose: {
      position: { x: -1951.7028138723192, y: 1770.5034239982174, z: 52.870026489273044 },
      orientation: { x: 0, y: 0, z: -0.9928242172830276, w: 0.11958291506876588 },
    },
    settings: {
      useCarModel: true,
      alpha,
    },
  };

  return (
    <Worldview
      defaultCameraState={{ ...DEFAULT_CAMERA_STATE, distance: 50, targetOffset, perspective: false }}
      cameraMode="perspective"
      hideDebug>
      <PoseMarkers>{[marker, markerWithoutColor, markerWithSettings, markerWithCarModel]}</PoseMarkers>
    </Worldview>
  );
}

storiesOf("<3DViz> - PoseMarkers", module)
  .addDecorator(withScreenshot({ delay: 3000 }))
  .add("alpha_0.3", () => <Example alpha={0.3} />)
  .add("alpha_0.5, color_50,200,50,0.8", () => <Example alpha={0.5} color="50,200,50,0.8" />)
  .add("alpha 0.8", () => <Example alpha={0.8} />)
  .add("alpha 1", () => <Example alpha={1} />);
