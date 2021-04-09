//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable import/no-webpack-loader-syntax */

import React from "react";

import WorldviewCodeEditor from "./utils/WorldviewCodeEditor";

function makeCodeComponent(raw, componentName, { isRowView, insertCodeSandboxStyle, noInline } = {}) {
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
      code={
        // For editors with noInline=true, the render() call will only work in the live editor,
        // not in the storybook
        code[1].trim().replace(/\/\/ #DOCS ONLY: /g, "")
      }
      nonEditableCode={code[0].trim()}
      componentName={componentName}
      isRowView={isRowView}
      insertCodeSandboxStyle={insertCodeSandboxStyle}
      noInline={noInline}
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

export const MouseEvents = makeCodeComponent(require("!!raw-loader!./api/MouseEvents"), "MouseEvents", {
  isRowView: true,
});

export const MouseEventsInstanced = makeCodeComponent(
  require("!!raw-loader!./api/MouseEventsInstanced"),
  "MouseEventsInstanced"
);

export const Arrows = makeCodeComponent(require("!!raw-loader!./commands/Arrows"), "Arrows");

export const ArrowsInteractive = makeCodeComponent(
  require("!!raw-loader!./commands/ArrowsInteractive"),
  "ArrowsInteractive"
);

export const Cones = makeCodeComponent(require("!!raw-loader!./commands/Cones"), "Cones");

export const Cubes = makeCodeComponent(require("!!raw-loader!./commands/Cubes"), "Cubes");

export const Cylinders = makeCodeComponent(require("!!raw-loader!./commands/Cylinders"), "Cylinders");

export const DrawPolygons = makeCodeComponent(require("!!raw-loader!./commands/DrawPolygons"), "DrawPolygons");

export const FilledPolygons = makeCodeComponent(require("!!raw-loader!./commands/FilledPolygons"), "FilledPolygons");

export const FilledPolygonsHitmap = makeCodeComponent(
  require("!!raw-loader!./commands/FilledPolygonsHitmap"),
  "FilledPolygonsHitmap"
);

export const GLText = makeCodeComponent(require("!!raw-loader!./commands/GLText"), "GLText", { noInline: true });

export const GLTextScaleInvariant = makeCodeComponent(
  require("!!raw-loader!./commands/GLTextScaleInvariant"),
  "GLTextScaleInvariant",
  { noInline: true }
);

export const GLTFScene = makeCodeComponent(require("!!raw-loader!./commands/GLTFScene"), "GLTFScene");

export const GLTFSceneHitmap = makeCodeComponent(require("!!raw-loader!./commands/GLTFSceneHitmap"), "GLTFSceneHitmap");

export const Grid = makeCodeComponent(require("!!raw-loader!./commands/Grid"), "Grid");

export const LinesDemo = makeCodeComponent(require("!!raw-loader!./commands/LinesDemo"), "LinesDemo");

export const LinesHitmap = makeCodeComponent(require("!!raw-loader!./commands/LinesHitmap"), "LinesHitmap");

export const LinesPoses = makeCodeComponent(require("!!raw-loader!./commands/LinesPoses"), "LinesPoses");

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

export const Text = makeCodeComponent(require("!!raw-loader!./commands/Text"), "Text", {
  insertCodeSandboxStyle: true,
});

export const Triangles = makeCodeComponent(require("!!raw-loader!./commands/Triangles"), "Triangles");

export const BasicExample = makeCodeComponent(require("!!raw-loader!./examples/BasicExample"), "BasicExample");

export const Composition = makeCodeComponent(require("!!raw-loader!./examples/Composition"), "Composition");

export const DynamicCommands = makeCodeComponent(require("!!raw-loader!./examples/DynamicCommands"), "DynamicCommands");

export const Hitmap = makeCodeComponent(require("!!raw-loader!./examples/Hitmap"), "Hitmap");

export const Wireframe = makeCodeComponent(require("!!raw-loader!./examples/Wireframe"), "Wireframe");

export const AddRemoveObstacles = makeCodeComponent(
  require("!!raw-loader!./tutorials/AddRemoveObstacles"),
  "AddingInteractivity"
);

export const ColorfulKnot = makeCodeComponent(require("!!raw-loader!./tutorials/ColorfulKnot"), "RenderingObjects");

export const CustomObject = makeCodeComponent(require("!!raw-loader!./tutorials/CustomObject"), "RenderingObjects");

export const FollowObject = makeCodeComponent(require("!!raw-loader!./tutorials/FollowObject"), "ManagingTheCamera");

export const FollowObjectOrientation = makeCodeComponent(
  require("!!raw-loader!./tutorials/FollowObjectOrientation"),
  "ManagingTheCamera"
);

export const HelloWorld = makeCodeComponent(require("!!raw-loader!./tutorials/HelloWorld"), "RenderingObjects");

export const InstancedRendering = makeCodeComponent(
  require("!!raw-loader!./tutorials/InstancedRendering"),
  "RenderingObjects"
);

export const MoveCamera = makeCodeComponent(require("!!raw-loader!./tutorials/MoveCamera"), "ManagingTheCamera");

export const StopReleaseDuck = makeCodeComponent(
  require("!!raw-loader!./tutorials/StopReleaseDuck"),
  "AddingInteractivity"
);
