// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { IntegrationTestModule } from "./types";
import ArrowsTests from "./worldview/Arrows";
import ConesTests from "./worldview/Cones";
import CubesTests from "./worldview/Cubes";
import CylinderTests from "./worldview/Cylinders";
import SpheresTests from "./worldview/Spheres";

const allTestModules: Array<IntegrationTestModule> = [ArrowsTests, ConesTests, CubesTests, CylinderTests, SpheresTests];

export default allTestModules;
