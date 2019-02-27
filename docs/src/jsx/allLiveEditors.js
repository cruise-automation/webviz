//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable import/no-webpack-loader-syntax */

import React from "react";

import WorldviewCodeEditor from "./utils/WorldviewCodeEditor";

function makeCodeComponent(raw, componentName, isRowView) {
  const code = raw
    .split("// #BEGIN EXAMPLE")[1]
    .split("// #END EXAMPLE")[0]
    .split("// #BEGIN EDITABLE");

  if (code.length !== 2) {
    throw new Error("Demo code must contain `// #BEGIN EXAMPLE`,  `// #BEGIN EDITABLE`, and `// #END EXAMPLE`");
  }

  // eslint-disable-next-line react/display-name
  return () => (
    <WorldviewCodeEditor
      code={code[1].trim()}
      nonEditableCode={code[0].trim()}
      componentName={componentName}
      isRowView={isRowView}
    />
  );
}

export const Arrows = makeCodeComponent(require("!!raw-loader!./Arrows"), "Arrows");

export const BasicExample = makeCodeComponent(require("!!raw-loader!./BasicExample"), "BasicExample");

export const CameraStateControlled = makeCodeComponent(
  require("!!raw-loader!./CameraStateControlled"),
  "CameraStateControlled"
);

export const CameraStateUncontrolled = makeCodeComponent(
  require("!!raw-loader!./CameraStateUncontrolled"),
  "CameraStateUncontrolled"
);

export const Composition = makeCodeComponent(require("!!raw-loader!./Composition"), "Composition");

export const Cones = makeCodeComponent(require("!!raw-loader!./Cones"), "Cones");

export const Cubes = makeCodeComponent(require("!!raw-loader!./Cubes"), "Cubes");

export const Cylinders = makeCodeComponent(require("!!raw-loader!./Cylinders"), "Cylinders");

export const DuckScene = makeCodeComponent(require("!!raw-loader!./DuckScene"), "DuckScene");

export const DynamicCommands = makeCodeComponent(require("!!raw-loader!./DynamicCommands"), "DynamicCommands");

export const FilledPolygons = makeCodeComponent(require("!!raw-loader!./FilledPolygons"), "FilledPolygons");

export const Hitmap = makeCodeComponent(require("!!raw-loader!./Hitmap"), "Hitmap");

export const LinesDemo = makeCodeComponent(require("!!raw-loader!./LinesDemo"), "LinesDemo");

export const LinesWireframe = makeCodeComponent(require("!!raw-loader!./LinesWireframe"), "LinesWireframe");

export const MouseEvents = makeCodeComponent(require("!!raw-loader!./MouseEvents"), "MouseEvents", true);

export const MouseEventsInstanced = makeCodeComponent(
  require("!!raw-loader!./MouseEventsInstanced"),
  "MouseEventsInstanced"
);

export const Overlay = makeCodeComponent(require("!!raw-loader!./Overlay"), "Overlay");

export const Points = makeCodeComponent(require("!!raw-loader!./Points"), "Points");

export const SpheresInstanced = makeCodeComponent(require("!!raw-loader!./SpheresInstanced"), "SpheresInstanced");

export const SpheresInstancedColor = makeCodeComponent(
  require("!!raw-loader!./SpheresInstancedColor"),
  "SpheresInstancedColor"
);

export const SpheresSingle = makeCodeComponent(require("!!raw-loader!./SpheresSingle"), "SpheresSingle");

export const Text = makeCodeComponent(require("!!raw-loader!./Text"), "Text");

export const Triangles = makeCodeComponent(require("!!raw-loader!./Triangles"), "Triangles");
