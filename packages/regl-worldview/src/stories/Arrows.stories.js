//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/react";
import React from "react";

import Worldview, { Arrows, Axes } from "../index";
import { withCustomRenderStates } from "./util";

storiesOf("Worldview/Arrows", module)
  .addDecorator(withKnobs)
  .add("<Arrows> with pose and custom depth and blend values", () => {
    const poseArrow = (shift) => ({
      pose: {
        orientation: { x: 0, y: 0, z: -1, w: 0.5 },
        position: { x: shift, y: 0, z: 0 },
      },
      scale: { x: 20, y: 3, z: 3 },
      color: { r: 1, g: 0, b: 0, a: 1 },
    });

    const arrows1 = [poseArrow(-3), poseArrow(0)];
    const arrows2 = [poseArrow(3), poseArrow(0)];

    return (
      <Worldview>
        <Arrows>{withCustomRenderStates(arrows1, arrows2)}</Arrows>
        <Axes />
      </Worldview>
    );
  })
  .add("<Arrows> with points and custom depth and blend values", () => {
    const pointArrow = (shift) => ({
      color: { r: 0, g: 0, b: 1, a: 1 },
      points: [{ x: 0 + shift, y: 0, z: 0 }, { x: 10 + shift, y: 10, z: 10 }],
      scale: { x: 2, y: 2, z: 3 },
    });

    const arrows1 = [pointArrow(-3), pointArrow(0)];
    const arrows2 = [pointArrow(3), pointArrow(0)];

    return (
      <Worldview>
        <Arrows>{withCustomRenderStates(arrows1, arrows2)}</Arrows>
        <Axes />
      </Worldview>
    );
  });
