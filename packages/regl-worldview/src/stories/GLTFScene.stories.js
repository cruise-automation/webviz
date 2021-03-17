//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import Worldview, { Axes, GLTFScene, Grid } from "../index";
import duckModel from "common/fixtures/Duck.glb"; // Webpack magic: we actually import a URL pointing to a .glb file

storiesOf("Worldview/GLTFScene", module).add("<GLTFScene> - Load a scene from file", () => {
  return (
    <Worldview
      defaultCameraState={{
        distance: 25,
        thetaOffset: (-3 * Math.PI) / 4,
      }}>
      <Axes />
      <Grid />
      <GLTFScene model={duckModel}>
        {{
          pose: {
            position: { x: 0, y: 3, z: 0 },
            orientation: { x: 0, y: 0, z: 1, w: 0 },
          },
          scale: { x: 1, y: 1, z: 1 },
        }}
      </GLTFScene>
    </Worldview>
  );
});
