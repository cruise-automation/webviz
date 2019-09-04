//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// #BEGIN EXAMPLE
import React, { useState } from "react";
import Worldview, { Axes, Grid, GLTFScene } from "regl-worldview";

import cesiumManModel from "../utils/CesiumMan.glb";
import duckModel from "common/fixtures/Duck.glb"; // Webpack magic: we actually import a URL pointing to a .glb file

// #BEGIN EDITABLE
function Example() {
  const [swapped, setSwapped] = useState(false);
  return (
    <Worldview
      defaultCameraState={{
        distance: 25,
        thetaOffset: (-3 * Math.PI) / 4,
      }}>
      <button style={{ position: "absolute", top: 0, left: 0 }} onClick={() => setSwapped(!swapped)}>
        Swap Models
      </button>
      <Axes />
      <Grid />
      <GLTFScene model={swapped ? cesiumManModel : duckModel}>
        {{
          pose: {
            position: { x: 0, y: -3, z: 0 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          scale: { x: 3, y: 3, z: 3 },
        }}
      </GLTFScene>
      <GLTFScene model={swapped ? duckModel : cesiumManModel}>
        {{
          pose: {
            position: { x: 0, y: 3, z: 0 },
            orientation: { x: 0, y: 0, z: 1, w: 0 },
          },
          scale: { x: 3, y: 3, z: 3 },
        }}
      </GLTFScene>
    </Worldview>
  );
}
// #END EXAMPLE

export default Example;
