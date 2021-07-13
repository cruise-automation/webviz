// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Based on http://schteppe.github.io/cannon.js/docs/files/src_math_Quaternion.js.html
// TODO(JP): Replace with glmatrix quat#fromEuler (http://glmatrix.net/docs/quat.js.html#line355).
export default function quaternionFromEuler({ x, y, z }: { x: number, y: number, z: number }) {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);

  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3,
  };
}

export function quaternionFromRpy({ roll, pitch, yaw }: { roll: number, pitch: number, yaw: number }) {
  // Adapted from https://github.com/iory/scikit-robot/blob/master/skrobot/coordinates/math.py#L857
  const { x, y, z, w } = quaternionFromEuler({ x: -roll, y: -pitch, z: -yaw });
  return { x: -x, y: -y, z: -z, w };
}
