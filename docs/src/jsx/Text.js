//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import Worldview, { Text, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
class TextDemo extends React.Component {
  render() {
    const labelMarker = {
      name: "randomName",
      text: "STOP",
      color: { r: 1, g: 1, b: 1, a: 1 },
      pose: {
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: -663.5469457766019, y: -246.2359293322153, z: -20 },
      },
      scale: { x: 1, y: 1, z: 1 },
    };

    return (
      <Worldview
        defaultCameraState={{
          ...DEFAULT_CAMERA_STATE,
          distance: 15,
          phi: 0,
          target: [-661, -242, -25],
          targetOffset: [-0.8, -3.8, 0],
          targetOrientation: [0, 0, 0, 1],
          thetaOffset: 9.62,
        }}
        hideDebug={true}>
        <Text>{[labelMarker]}</Text>
      </Worldview>
    );
  }
}
// #END EXAMPLE

export default TextDemo;
