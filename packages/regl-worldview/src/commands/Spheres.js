// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type { SphereList } from "../types";
import fromGeometry from "../utils/fromGeometry";
import { createInstancedGetChildrenForHitmap } from "../utils/getChildrenForHitmapDefaults";
import Command, { type CommonCommandProps } from "./Command";

const NUM_PARALLELS = 15;
const NUM_MERIDIANS = 15;
const RADIUS = 0.5;

const northPole = [0, 0, RADIUS];
const southPole = [0, 0, -RADIUS];
const points = [northPole, southPole];
const faces = [];

for (let i = 0; i < NUM_PARALLELS; i++) {
  for (let j = 0; j < NUM_MERIDIANS; j++) {
    const phi = ((i + 1) / (NUM_PARALLELS + 1)) * Math.PI;
    const z = RADIUS * Math.cos(phi);
    const width = RADIUS * Math.sin(phi);
    const theta = (j * 2 * Math.PI) / NUM_MERIDIANS;
    const x = width * Math.cos(theta);
    const y = width * Math.sin(theta);
    points.push([x, y, z]);
    if (j > 0) {
      // connect to previous parallel (or north pole)
      const prevMeridianPt = i === 0 ? 0 : points.length - 1 - NUM_MERIDIANS;
      faces.push([points.length - 2, points.length - 1, prevMeridianPt]);
      if (i > 0) {
        faces.push([points.length - 2, prevMeridianPt - 1, prevMeridianPt]);
      }
    }
  }
  // connect to previous parallel (or north pole)
  const prevMeridianPt = i === 0 ? 0 : points.length - 2 * NUM_MERIDIANS;
  faces.push([points.length - 1, points.length - NUM_MERIDIANS, prevMeridianPt]);
  if (i > 0) {
    faces.push([points.length - 1, points.length - NUM_MERIDIANS - 1, prevMeridianPt]);
  }
}
// connect last parallel to south pole
for (let j = 0; j < NUM_MERIDIANS; j++) {
  const pt = points.length - NUM_MERIDIANS + j;
  const prevPt = j === 0 ? points.length - 1 : pt - 1;
  faces.push([pt, prevPt, 1]);
}

const spheres = fromGeometry(points, faces);

const getChildrenForHitmap = createInstancedGetChildrenForHitmap(1);
export default function Spheres(props: { ...CommonCommandProps, children: SphereList[] }) {
  return <Command getChildrenForHitmap={getChildrenForHitmap} {...props} reglCommand={spheres} />;
}
