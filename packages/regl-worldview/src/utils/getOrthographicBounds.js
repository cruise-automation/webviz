// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

class BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;

  constructor(left: number, top: number) {
    this.left = left;
    this.top = top;
    this.right = -left;
    this.bottom = -top;
    this.width = Math.abs(left) * 2;
    this.height = Math.abs(top) * 2;
  }
}

export default function getOrthographicBounds(zDistance: number, width: number, height: number): BoundingBox {
  const aspect = width / height;
  // never go below ground level
  const distanceToGround = Math.abs(zDistance);
  const left = (-distanceToGround / 2) * aspect;
  const top = distanceToGround / 2;
  return new BoundingBox(left, top);
}
