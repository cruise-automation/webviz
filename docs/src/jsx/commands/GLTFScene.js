//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Axes, Grid, GLTFScene, DEFAULT_CAMERA_STATE } from "regl-worldview";

import cesiumManModel from "../utils/CesiumMan.glb";
import duckModel from "../utils/Duck.glb"; // URL pointing to a .glb file

// #BEGIN EDITABLE
function Example() {
  const [model, setModel] = useState(duckModel);
  return (
    <Worldview
      defaultCameraState={{
        ...DEFAULT_CAMERA_STATE,
        distance: 15,
        thetaOffset: (-3 * Math.PI) / 4,
      }}>
      <button
        style={{ position: "absolute", top: 0, left: 0 }}
        onClick={() => setModel(model === duckModel ? cesiumManModel : duckModel)}>
        Switch Model
      </button>
      <Axes />
      <Grid />
      <GLTFScene model={model}>
        {{
          pose: {
            position: { x: 0, y: 0, z: 0 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          scale: { x: 3, y: 3, z: 3 },
        }}
      </GLTFScene>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
