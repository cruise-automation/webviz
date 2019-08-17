//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BasicExample from "./1.1.BasicExample.mdx";
import Composition from "./1.2.Composition.mdx";
import DynamicCommands from "./1.3.DynamicCommands.mdx";
import Interactivity from "./1.4.Interactivity.mdx";
import Wireframe from "./1.5.Wireframe.mdx";
import QuickStart from "./2.1.QuickStart.mdx";
import Introduction from "./2.2.Introduction.mdx";
import RenderingObjects from "./2.3.RenderingObjects.mdx";
import ManagingTheCamera from "./2.4.ManagingTheCamera.mdx";
import AddingInteractivity from "./2.5.AddingInteractivity.mdx";
import Worldview from "./3.1.Worldview.mdx";
import Camera from "./3.2.Camera.mdx";
import Command from "./3.3.Command.mdx";
import MouseEvents from "./3.4.MouseEvents.mdx";
import Flow from "./3.5.FlowTypes.mdx";
import BrowserSupport from "./3.6.BrowserSupport.mdx";
import Glossary from "./3.7.Glossary.mdx";
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
  Wireframe,
  QuickStart,
  Introduction,
  RenderingObjects,
  ManagingTheCamera,
  AddingInteractivity,
  Worldview,
  Camera,
  Command,
  MouseEvents,
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
  Glossary,
};

const ROUTE_CONFIG = [
  { name: "Guides", subRouteNames: ["Quick Start"] },
  {
    name: "Tutorial",
    subRouteNames: ["Introduction", "Rendering Objects", "Managing the Camera", "Adding Interactivity"],
  },
  {
    name: "Examples",
    subRouteNames: ["Basic Example", "Composition", "Dynamic Commands", "Interactivity", "Wireframe"],
  },
  {
    name: "API",
    subRouteNames: ["Worldview", "Camera", "Command", "Mouse Events", "Flow", "Browser Support", "Glossary"],
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

let nameToUrlMap;
// get the hash part of the url by subRouteName, e.g.  'arrow' => `/docs/commands/arrows`
// used to autogen doc links by component name in CodeSandbox
export function getHashUrlByComponentName(name) {
  // only generate the map once
  if (!nameToUrlMap) {
    nameToUrlMap = {};
    ROUTE_CONFIG.forEach(({ name, subRouteNames }) => {
      subRouteNames.forEach((subRouteName) => {
        const componentName = getComponentName(subRouteName);
        const subRoutePath = getSubRoutePath(subRouteName);
        nameToUrlMap[componentName] = `/docs/${name.toLowerCase()}/${subRoutePath}`;
      });
    });
  }
  return nameToUrlMap[name] || "";
}

// convert route names to component names, e.g. `Managing the Camera` => `ManagingTheCamera`
function getComponentName(routeName) {
  return routeName.replace(/(\b[a-z](?!\s))/g, (firstWordLetter) => firstWordLetter.toUpperCase()).replace(/\s/g, "");
}

function getSubRoutePath(subRouteName) {
  return `${subRouteName.toLowerCase().replace(/\s/g, "-")}`;
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
        path: `/${getSubRoutePath(subRouteName)}`,
        name: subRouteName,
        main: subComponentName,
      };
    }),
  };
});
