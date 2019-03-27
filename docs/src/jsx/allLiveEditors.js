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

export const CameraStateControlled = makeCodeComponent(
  require("!!raw-loader!./api/CameraStateControlled"),
  "CameraStateControlled"
);

export const CameraStateUncontrolled = makeCodeComponent(
  require("!!raw-loader!./api/CameraStateUncontrolled"),
  "CameraStateUncontrolled"
);

export const MouseEvents = makeCodeComponent(require("!!raw-loader!./api/MouseEvents"), "MouseEvents", true);

export const MouseEventsInstanced = makeCodeComponent(
  require("!!raw-loader!./api/MouseEventsInstanced"),
  "MouseEventsInstanced"
);

export const Arrows = makeCodeComponent(require("!!raw-loader!./commands/Arrows"), "Arrows");

export const Cones = makeCodeComponent(require("!!raw-loader!./commands/Cones"), "Cones");

export const Cubes = makeCodeComponent(require("!!raw-loader!./commands/Cubes"), "Cubes");

export const Cylinders = makeCodeComponent(require("!!raw-loader!./commands/Cylinders"), "Cylinders");

export const DuckScene = makeCodeComponent(require("!!raw-loader!./commands/DuckScene"), "DuckScene");

export const FilledPolygons = makeCodeComponent(require("!!raw-loader!./commands/FilledPolygons"), "FilledPolygons");

export const FilledPolygonsHitmap = makeCodeComponent(
  require("!!raw-loader!./commands/FilledPolygonsHitmap"),
  "FilledPolygonsHitmap"
);

export const LinesDemo = makeCodeComponent(require("!!raw-loader!./commands/LinesDemo"), "LinesDemo");

export const LinesWireframe = makeCodeComponent(require("!!raw-loader!./commands/LinesWireframe"), "LinesWireframe");

export const Overlay = makeCodeComponent(require("!!raw-loader!./commands/Overlay"), "Overlay");

export const Points = makeCodeComponent(require("!!raw-loader!./commands/Points"), "Points");

export const SpheresInstanced = makeCodeComponent(
  require("!!raw-loader!./commands/SpheresInstanced"),
  "SpheresInstanced"
);

export const SpheresInstancedColor = makeCodeComponent(
  require("!!raw-loader!./commands/SpheresInstancedColor"),
  "SpheresInstancedColor"
);

export const SpheresSingle = makeCodeComponent(require("!!raw-loader!./commands/SpheresSingle"), "SpheresSingle");

export const Text = makeCodeComponent(require("!!raw-loader!./commands/Text"), "Text");

export const Triangles = makeCodeComponent(require("!!raw-loader!./commands/Triangles"), "Triangles");

export const BasicExample = makeCodeComponent(require("!!raw-loader!./examples/BasicExample"), "BasicExample");

export const Composition = makeCodeComponent(require("!!raw-loader!./examples/Composition"), "Composition");

export const DynamicCommands = makeCodeComponent(require("!!raw-loader!./examples/DynamicCommands"), "DynamicCommands");

export const Hitmap = makeCodeComponent(require("!!raw-loader!./examples/Hitmap"), "Hitmap");

export const C11HelloWorld = makeCodeComponent(require("!!raw-loader!./tutorials/C11HelloWorld"), "RenderingObjects");

export const C12CustomObject = makeCodeComponent(
  require("!!raw-loader!./tutorials/C12CustomObject"),
  "RenderingObjects"
);

export const C13ColorfulKnot = makeCodeComponent(
  require("!!raw-loader!./tutorials/C13ColorfulKnot"),
  "RenderingObjects"
);

export const C14InstancedRendering = makeCodeComponent(
  require("!!raw-loader!./tutorials/C14InstancedRendering"),
  "RenderingObjects"
);

export const C21MoveCamea = makeCodeComponent(require("!!raw-loader!./tutorials/C21MoveCamea"), "ManagingTheCamera");

export const C22FollowObject = makeCodeComponent(
  require("!!raw-loader!./tutorials/C22FollowObject"),
  "ManagingTheCamera"
);

export const C23FollowObjectOrientation = makeCodeComponent(
  require("!!raw-loader!./tutorials/C23FollowObjectOrientation"),
  "ManagingTheCamera"
);

export const C31AddRemoveObstacles = makeCodeComponent(
  require("!!raw-loader!./tutorials/C31AddRemoveObstacles"),
  "AddingInteractivity"
);

export const C32StopReleaseDuck = makeCodeComponent(
  require("!!raw-loader!./tutorials/C32StopReleaseDuck"),
  "AddingInteractivity"
);
