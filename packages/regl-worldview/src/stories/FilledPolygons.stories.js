//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/react";
import React from "react";

import { FilledPolygons } from "../index";
import Container from "./Container";
import { withCustomRenderStates } from "./util";

storiesOf("Worldview/FilledPolygons", module)
  .addDecorator(withKnobs)
  .add("<FilledPolygons> with points and color", () => {
    return (
      <Container cameraState={{ perspective: true, phi: 1.83, thetaOffset: -1.1 }}>
        <FilledPolygons>
          {[
            {
              points: [{ x: 0, y: 10, z: 0 }, { x: 10, y: 10, z: 0 }, { x: 10, y: 0, z: 10 }, { x: 0, y: 0, z: 10 }],
              color: { r: 0, g: 1, b: 0, a: 1 },
            },
          ]}
        </FilledPolygons>
      </Container>
    );
  })
  .add("<FilledPolygons> with custom depth and blend values", () => {
    return (
      <Container cameraState={{ perspective: true, phi: 1.83, thetaOffset: -1.1 }}>
        <FilledPolygons>
          {withCustomRenderStates(
            [
              {
                points: [{ x: 0, y: 10, z: 0 }, { x: 10, y: 10, z: 0 }, { x: 10, y: 0, z: 10 }, { x: 0, y: 0, z: 10 }],
                color: { r: 0, g: 1, b: 0, a: 1 },
              },
            ],
            [
              {
                points: [{ x: -5, y: 10, z: 0 }, { x: 5, y: 10, z: 0 }, { x: 5, y: 0, z: 10 }, { x: -5, y: 0, z: 10 }],
                color: { r: 0, g: 1, b: 0, a: 1 },
              },
            ]
          )}
        </FilledPolygons>
      </Container>
    );
  });
