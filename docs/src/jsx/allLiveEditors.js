//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable import/no-webpack-loader-syntax */

import React from "react";

import WorldviewCodeEditor from "./WorldviewCodeEditor";

function makeCodeComponent(raw) {
  const code = raw
    .split("// #BEGIN EXAMPLE")[1]
    .split("// #END EXAMPLE")[0]
    .trim();
  // eslint-disable-next-line react/display-name
  return () => <WorldviewCodeEditor code={code} />;
}

export const Arrows = makeCodeComponent(require("!!raw-loader!./Arrows"));

export const BasicExample = makeCodeComponent(require("!!raw-loader!./BasicExample"));

export const CameraStateControlled = makeCodeComponent(require("!!raw-loader!./CameraStateControlled"));

export const CameraStateUncontrolled = makeCodeComponent(require("!!raw-loader!./CameraStateUncontrolled"));

export const Composition = makeCodeComponent(require("!!raw-loader!./Composition"));

export const Cones = makeCodeComponent(require("!!raw-loader!./Cones"));

export const Cubes = makeCodeComponent(require("!!raw-loader!./Cubes"));

export const Cylinders = makeCodeComponent(require("!!raw-loader!./Cylinders"));

export const DynamicCommands = makeCodeComponent(require("!!raw-loader!./DynamicCommands"));

export const FilledPolygons = makeCodeComponent(require("!!raw-loader!./FilledPolygons"));

export const Hitmap = makeCodeComponent(require("!!raw-loader!./Hitmap"));

export const LinesDemo = makeCodeComponent(require("!!raw-loader!./LinesDemo"));

export const LinesWireframe = makeCodeComponent(require("!!raw-loader!./LinesWireframe"));

export const Overlay = makeCodeComponent(require("!!raw-loader!./Overlay"));

export const Points = makeCodeComponent(require("!!raw-loader!./Points"));

export const SpheresInstanced = makeCodeComponent(require("!!raw-loader!./SpheresInstanced"));

export const SpheresInstancedColor = makeCodeComponent(require("!!raw-loader!./SpheresInstancedColor"));

export const SpheresSingle = makeCodeComponent(require("!!raw-loader!./SpheresSingle"));

export const Text = makeCodeComponent(require("!!raw-loader!./Text"));

export const Triangles = makeCodeComponent(require("!!raw-loader!./Triangles"));
