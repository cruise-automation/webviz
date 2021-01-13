//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/react";
import React from "react";

import { Cylinders } from "../index";
import Container from "./Container";
import { withCustomRenderStates } from "./util";

storiesOf("Worldview/Cylinders", module)
  .addDecorator(withKnobs)
  .add("<Cylinders> with custom depth and blend values", () => {
    return (
      <Container cameraState={{ perspective: true, phi: 1.83, thetaOffset: -1.1 }}>
        <Cylinders>
          {withCustomRenderStates(
            [
              {
                pose: {
                  orientation: { x: 0, y: 0, z: 0, w: 1 },
                  position: { x: 0, y: 0, z: 0 },
                },
                scale: { x: 10, y: 10, z: 10 },
                color: { r: 1, g: 0, b: 1, a: 0.5 },
              },
            ],
            [
              {
                pose: {
                  orientation: { x: 0, y: 0, z: 0, w: 1 },
                  position: { x: 0, y: 0, z: 0 },
                },
                scale: { x: 10, y: 10, z: 10 },
                color: { r: 1, g: 1, b: 0, a: 0.5 },
                points: [{ x: -10, y: 10, z: 10 }, { x: -20, y: 5, z: 10 }],
              },
            ]
          )}
        </Cylinders>
      </Container>
    );
  });
