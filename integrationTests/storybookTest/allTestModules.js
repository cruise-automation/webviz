// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { IntegrationTestModule } from "./types";
import ArrowsTests from "./worldview/Arrows";
import AxesTests from "./worldview/Axes";
import ConesTests from "./worldview/Cones";
import CubesTests from "./worldview/Cubes";
import CylinderTests from "./worldview/Cylinders";
import FilledPolygonsTests from "./worldview/FilledPolygons";
import GLTFSceneTests from "./worldview/GLTFScene";
import GridTests from "./worldview/Grid";
import LinesTests from "./worldview/Lines";
import PointsTests from "./worldview/Points";
import SpheresTests from "./worldview/Spheres";
import TrianglesTests from "./worldview/Triangles";
import WorldviewTests from "./worldview/Worldview";

const allTestModules: Array<IntegrationTestModule> = [
  AxesTests,
  ArrowsTests,
  ConesTests,
  CubesTests,
  CylinderTests,
  FilledPolygonsTests,
  GLTFSceneTests,
  GridTests,
  LinesTests,
  PointsTests,
  SpheresTests,
  TrianglesTests,
  WorldviewTests,
];

export default allTestModules;
