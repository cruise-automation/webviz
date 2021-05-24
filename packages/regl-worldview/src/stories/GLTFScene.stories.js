//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import Worldview, { Axes, GLTFScene, Grid } from "../index";

storiesOf("Worldview/GLTFScene", module)
  .add("<GLTFScene> - Load a scene from file", () => {
    const model = require("common/fixtures/Duck.glb");
    return (
      <Worldview
        defaultCameraState={{
          distance: 25,
          thetaOffset: (-3 * Math.PI) / 4,
        }}>
        <Axes />
        <Grid />
        <GLTFScene model={model}>
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
  })
  .add("<GLTFScene> - Load a scene from a file with Draco-compressed buffers", () => {
    const model = require("common/fixtures/Duck-Compressed.glb");
    return (
      <Worldview
        defaultCameraState={{
          distance: 25,
          thetaOffset: (-3 * Math.PI) / 4,
        }}>
        <Axes />
        <Grid />
        <GLTFScene model={model}>
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
  })
  .add("<GLTFScene> - Load a scene with default texture samplers", () => {
    const model = require("common/fixtures/gltf_bug_sampler.glb");
    return (
      <Worldview
        defaultCameraState={{
          distance: 25,
          thetaOffset: (-3 * Math.PI) / 4,
        }}>
        <Axes />
        <Grid />
        <GLTFScene model={model}>
          {{
            pose: {
              position: { x: 0, y: 3, z: 0 },
              orientation: { x: 0, y: 0, z: 1, w: 0 },
            },
            scale: { x: 0.01, y: 0.01, z: 0.01 },
          }}
        </GLTFScene>
      </Worldview>
    );
  });
