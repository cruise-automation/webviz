//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BasicExample from './1.1BasicExample.md';
import Composition from './1.2Composition.md';
import DynamicCommands from './1.3DynamicCommands.md';
import Interactivity from './1.4Interactivity.md';

import QuickStart from './2.1QuickStart.md';

import Worldview from './3.1Worldview.md';
import Camera from './3.2Camera.md';
import Command from './3.3Command.md';
import Arrows from './3.4Arrows.md';
import Cones from './3.5Cones.md';
import Cubes from './3.6Cubes.md';
import Cylinders from './3.7Cylinders.md';
import FilledPolygons from './3.8FilledPolygons.md';
import Lines from './3.10Lines.md';
import Overlay from './3.11Overlay.md';
import Points from './3.12Points.md';
import Spheres from './3.13Spheres.md';
import Text from './3.14Text.md';
import Triangles from './3.15Triangles.md';

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
};

const ROUTE_CONFIG = [
  {
    name: 'Examples',
    subRouteNames: ['Basic Example', 'Composition', 'Dynamic Commands', 'Interactivity'],
  },
  { name: 'Guides', subRouteNames: ['Quick Start'] },
  {
    name: 'API',
    subRouteNames: [
      'Worldview',
      'Camera',
      'Command',
      'Arrows',
      'Cones',
      'Cubes',
      'Cylinders',
      'FilledPolygons',
      'Lines',
      'Overlay',
      'Points',
      'Spheres',
      'Text',
      'Triangles',
    ],
  },
];

// convert route names to component names, e.g. 'Quick Start' => 'QuickStart'
function getComponentName(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
    if (+match === 0) return ''; // or if (/\s+/.test(match)) for white spaces
    return match.toUpperCase();
  });
}

export default ROUTE_CONFIG.map(({ name, subRouteNames }) => {
  const componentName = getComponentName(name);
  return {
    path: `/${componentName}`,
    name: componentName,
    exact: true,
    subRoutes: subRouteNames.map((subRouteName, idx) => {
      const subComponentName = getComponentName(subRouteName);
      return {
        exact: idx !== 0,
        path: `/${subComponentName}`,
        name: subRouteName,
        main: subComponentName,
      };
    }),
  };
});
