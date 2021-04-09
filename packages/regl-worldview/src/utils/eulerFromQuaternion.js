// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mat3 } from "gl-matrix";

import type { Vec3, Vec4 } from "../types";

const scratch = [0, 0, 0, 0, 0, 0, 0, 0, 0];

// gl-matrix clone of three.js Euler.setFromQuaternion
// assumes default XYZ order
export default function eulerFromQuaternion(out: number[], q: Vec4): Vec3 {
  const m = mat3.fromQuat(scratch, q);
  const m11 = m[0], m12 = m[3], m13 = m[6]; // prettier-ignore
  const             m22 = m[4], m23 = m[7]; // prettier-ignore
  const             m32 = m[5], m33 = m[8]; // prettier-ignore

  out[1] = Math.asin(m13 < -1 ? -1 : m13 > 1 ? 1 : m13);
  if (Math.abs(m13) < 0.99999) {
    out[0] = Math.atan2(-m23, m33);
    out[2] = Math.atan2(-m12, m11);
  } else {
    out[0] = Math.atan2(m32, m22);
    out[2] = 0;
  }
  return (out: any);
}
