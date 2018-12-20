//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";

import InputNumber from "./InputNumber";
import { FloatingBox } from "./WorldviewCodeEditor";
import Worldview, { Axes, Grid, DEFAULT_CAMERA_STATE } from "regl-worldview";

// #BEGIN EXAMPLE
function CameraStateUncontrolled() {
  const [distance, setDistance] = useState(100);

  return (
    <Worldview
      defaultCameraState={{
        ...DEFAULT_CAMERA_STATE,
        distance,
      }}>
      <FloatingBox>
        <InputNumber label="distance" value={distance} min={0} max={400} step={1} onChange={setDistance} />
      </FloatingBox>
      <Grid />
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default CameraStateUncontrolled;
