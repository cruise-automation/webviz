//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BasicExample from "./1.1.BasicExample.mdx";
import Composition from "./1.2.Composition.mdx";
import DynamicCommands from "./1.3.DynamicCommands.mdx";
import Interactivity from "./1.4.Interactivity.mdx";
import QuickStart from "./2.1.QuickStart.mdx";
import Worldview from "./3.1.Worldview.mdx";
import Camera from "./3.2.Camera.mdx";
import Command from "./3.3.Command.mdx";
import Flow from "./3.4.FlowTypes.mdx";
import BrowserSupport from "./3.5.BrowserSupport.mdx";
import Arrows from "./4.1.Arrows.mdx";
import Text from "./4.10.Text.mdx";
import Triangles from "./4.11.Triangles.mdx";
import GLTFScene from "./4.12.GLTFScene.mdx";
import Cones from "./4.2.Cones.mdx";
import Cubes from "./4.3.Cubes.mdx";
import Cylinders from "./4.4.Cylinders.mdx";
import FilledPolygons from "./4.5.FilledPolygons.mdx";
import Lines from "./4.6.Lines.mdx";
import Overlay from "./4.7.Overlay.mdx";
import Points from "./4.8.Points.mdx";
import Spheres from "./4.9.Spheres.mdx";

export const componentList = {
  BasicExample,
  Composition,
  DynamicCommands,
  Interactivity,
  QuickStart,
  Worldview,
  Camera,
  Command,
  Arrows,
  Cones,
  Cubes,
  Cylinders,
  FilledPolygons,
  Lines,
  Overlay,
  Points,
  Spheres,
  Text,
  Triangles,
  Flow,
  GLTFScene,
  BrowserSupport,
};

const ROUTE_CONFIG = [
  { name: "Guides", subRouteNames: ["Quick Start"] },
  {
    name: "Examples",
    subRouteNames: ["Basic Example", "Composition", "Dynamic Commands", "Interactivity"],
  },
  {
    name: "API",
    subRouteNames: ["Worldview", "Camera", "Command", "Flow", "Browser Support"],
  },
  {
    name: "Commands",
    subRouteNames: [
      "Arrows",
      "Cones",
      "Cubes",
      "Cylinders",
      "FilledPolygons",
      "Lines",
      "Overlay",
      "Points",
      "Spheres",
      "Text",
      "Triangles",
      "GLTFScene",
    ],
  },
];

// convert route names to component names, e.g. 'Quick Start' => 'QuickStart'
function getComponentName(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
    // or if (/\s+/.test(match)) for white spaces
    if (+match === 0) {
      return "";
    }
    return match.toUpperCase();
  });
}

export default ROUTE_CONFIG.map(({ name, subRouteNames }) => {
  const componentName = getComponentName(name);
  return {
    path: `/docs/${componentName.toLowerCase()}`,
    name: componentName,
    exact: true,
    subRoutes: subRouteNames.map((subRouteName, idx) => {
      const subComponentName = getComponentName(subRouteName);
      return {
        exact: idx !== 0,
        path: `/${subComponentName.toLowerCase()}`,
        name: subRouteName,
        main: subComponentName,
      };
    }),
  };
});
