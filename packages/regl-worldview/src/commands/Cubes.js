//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// @flow
import { SimpleCommand, makeCommand } from './Command';
import type { Cube } from '../types';
import fromGeometry from '../utils/fromGeometry';

const Cubes: Class<SimpleCommand<Cube>> = (makeCommand(
  'Cubes',
  fromGeometry(
    [
      // bottom face corners
      [-0.5, -0.5, -0.5],
      [-0.5, 0.5, -0.5],
      [0.5, -0.5, -0.5],
      [0.5, 0.5, -0.5],
      // top face corners
      [-0.5, -0.5, 0.5],
      [-0.5, 0.5, 0.5],
      [0.5, -0.5, 0.5],
      [0.5, 0.5, 0.5],
    ],
    [
      // bottom
      [0, 1, 2],
      [1, 2, 3],
      // top
      [4, 5, 6],
      [5, 6, 7],
      // left
      [0, 2, 4],
      [2, 4, 6],
      // right
      [1, 3, 5],
      [3, 5, 7],
      //front
      [2, 3, 6],
      [3, 6, 7],
      //back
      [0, 1, 4],
      [1, 4, 5],
    ]
  )
): Class<SimpleCommand<any>>);

export default Cubes;
