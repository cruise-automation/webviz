//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import Worldview, { Axes, Grid, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
function CameraStateUncontrolled() {
  const cameraState = { ...DEFAULT_CAMERA_STATE, perspective: true };
  return (
    <Worldview defaultCameraState={cameraState} hideDebug={true}>
      <Grid />
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default CameraStateUncontrolled;
