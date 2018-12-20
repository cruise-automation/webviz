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
function CameraStateControlled() {
  const [distance, setDistance] = useState(100);
  const [cameraState, setCamerState] = useState({ ...DEFAULT_CAMERA_STATE, distance });

  return (
    <Worldview
      cameraState={cameraState}
      onCameraStateChange={(newCamState) => {
        setCamerState(newCamState);
        setDistance(newCamState.distance);
      }}>
      <FloatingBox>
        <InputNumber
          label="distance"
          value={distance}
          min={0}
          max={400}
          step={1}
          onChange={(newDistance) => {
            setDistance(newDistance);
            setCamerState({ ...cameraState, distance: newDistance });
          }}
        />
      </FloatingBox>
      <Grid />
      <Axes />
    </Worldview>
  );
}
// #END EXAMPLE

export default CameraStateControlled;
