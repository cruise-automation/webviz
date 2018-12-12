// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { makeCommand } from './Command';
import fromGeometry from '../utils/fromGeometry';
import type { BaseShape } from '../types';
import { createCylinderGeometry } from './Cylinders';

const { points, sideFaces, endCapFaces } = createCylinderGeometry(30, true);

// prettier-ignore
const Cylinders = makeCommand<BaseShape>('Cylinders', fromGeometry(points, sideFaces.concat(endCapFaces)));

export default Cylinders;
