// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Point } from "../types";

// a single min/max value
class Bound {
  min: number;
  max: number;

  constructor() {
    this.min = Number.MAX_SAFE_INTEGER;
    this.max = Number.MIN_SAFE_INTEGER;
  }
  // update the bound based on a value
  update(value: number) {
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);
  }
}

// represents x, y, and z min & max bounds for a 3d scene
export default class Bounds {
  x: Bound;
  y: Bound;
  z: Bound;

  constructor() {
    this.x = new Bound();
    this.y = new Bound();
    this.z = new Bound();
  }

  // update the bounds based on a point
  update(point: Point) {
    this.x.update(point.x);
    this.y.update(point.y);
    this.z.update(point.z);
  }
}
