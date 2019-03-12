//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Arrows from "./Arrows";
import BasicExample from "./BasicExample";
import CameraStateControlled from "./CameraStateControlled";
import CameraStateUncontrolled from "./CameraStateUncontrolled";
import Composition from "./Composition";
import Cones from "./Cones";
import Cubes from "./Cubes";
import Cylinders from "./Cylinders";
import DuckScene from "./DuckScene";
import DynamicCommands from "./DynamicCommands";
import FilledPolygons from "./FilledPolygons";
import Hitmap from "./Hitmap";
import LinesDemo from "./LinesDemo";
import LinesWireframe from "./LinesWireframe";
import MouseEvents from "./MouseEvents";
import Overlay from "./Overlay";
import Points from "./Points";
import SpheresInstanced from "./SpheresInstanced";
import SpheresInstancedColor from "./SpheresInstancedColor";
import SpheresSingle from "./SpheresSingle";
import Text from "./Text";
import Triangles from "./Triangles";

const allDemos = {
  Arrows,
  BasicExample,
  CameraStateControlled,
  CameraStateUncontrolled,
  Composition,
  Cones,
  Cubes,
  Cylinders,
  DynamicCommands,
  FilledPolygons,
  Hitmap,
  LinesDemo,
  LinesWireframe,
  MouseEvents,
  Overlay,
  Points,
  SpheresInstanced,
  SpheresInstancedColor,
  SpheresSingle,
  Text,
  Triangles,
  DuckScene,
};

const stories = storiesOf("Worldview docs", module);
stories.addDecorator(withScreenshot());

Object.keys(allDemos).map((demoName) => {
  const Component = allDemos[demoName];
  return stories.add(demoName, () => {
    return (
      <div style={{ height: 500 }}>
        <Component />
      </div>
    );
  });
});
