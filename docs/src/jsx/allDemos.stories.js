//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import CameraStateControlled from "./api/CameraStateControlled";
import CameraStateUncontrolled from "./api/CameraStateUncontrolled";
import MouseEvents from "./api/MouseEvents";
import Arrows from "./commands/Arrows";
import Cones from "./commands/Cones";
import Cubes from "./commands/Cubes";
import Cylinders from "./commands/Cylinders";
import FilledPolygons from "./commands/FilledPolygons";
import GLTFScene from "./commands/GLTFScene";
import LinesDemo from "./commands/LinesDemo";
import LinesWireframe from "./commands/LinesWireframe";
import Overlay from "./commands/Overlay";
import Points from "./commands/Points";
import SpheresInstanced from "./commands/SpheresInstanced";
import SpheresInstancedColor from "./commands/SpheresInstancedColor";
import SpheresSingle from "./commands/SpheresSingle";
import Text from "./commands/Text";
import Triangles from "./commands/Triangles";
import BasicExample from "./examples/BasicExample";
import Composition from "./examples/Composition";
import DynamicCommands from "./examples/DynamicCommands";
import Hitmap from "./examples/Hitmap";

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
  GLTFScene,
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
