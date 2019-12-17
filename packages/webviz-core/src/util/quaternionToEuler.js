// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Based on http://schteppe.github.io/cannon.js/docs/files/src_math_Quaternion.js.html
// TODO(JP): See if there is an equivalent in glmatrix, and otherwise contribute this.
export default function quaternionToEuler({ x, y, z, w }: { x: number, y: number, z: number, w: number }) {
  let heading, attitude, bank;
  const test = x * y + z * w;
  if (test > 0.499) {
    // singularity at north pole
    heading = 2 * Math.atan2(x, w);
    attitude = Math.PI / 2;
    bank = 0;
  }
  if (test < -0.499) {
    // singularity at south pole
    heading = -2 * Math.atan2(x, w);
    attitude = -Math.PI / 2;
    bank = 0;
  }
  if (isNaN(heading)) {
    const sqx = x * x;
    const sqy = y * y;
    const sqz = z * z;
    heading = Math.atan2(2 * y * w - 2 * x * z, 1 - 2 * sqy - 2 * sqz); // Heading
    attitude = Math.asin(2 * test); // attitude
    bank = Math.atan2(2 * x * w - 2 * y * z, 1 - 2 * sqx - 2 * sqz); // bank
  }

  return {
    x: bank,
    y: heading,
    z: attitude,
  };
}
