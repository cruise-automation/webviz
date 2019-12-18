// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import { Lines, Spheres, type Point } from "regl-worldview";

type Props = {
  measurePoints: { start: ?Point, end: ?Point },
};

const sphereSize: number = 0.3;
const lineSize: number = 0.1;

const defaultSphere: any = Object.freeze({
  type: 2,
  action: 0,
  scale: { x: sphereSize, y: sphereSize, z: 0.1 },
  color: { r: 1, g: 0.2, b: 0, a: 1 },
});
const defaultPose: any = Object.freeze({ orientation: { x: 0, y: 0, z: 0, w: 1 } });

export default function MeasureMarker({ measurePoints: { start, end } }: Props) {
  const spheres = [];
  const lines = [];
  if (start) {
    const startPoint = { ...start };

    spheres.push({
      ...defaultSphere,
      id: "_measure_start",
      pose: { position: startPoint, ...defaultPose },
    });

    if (end) {
      const endPoint = { ...end };
      lines.push({
        ...defaultSphere,
        id: "_measure_line",
        points: [start, end],
        pose: { ...defaultPose, position: { x: 0, y: 0, z: 0 } },
        scale: { x: lineSize, y: 1, z: 1 },
        type: 4,
      });

      spheres.push({
        ...defaultSphere,
        id: "_measure_end",
        pose: { position: endPoint, ...defaultPose },
      });
    }
  }

  return (
    <>
      {lines.length && <Lines>{lines}</Lines>}
      {spheres.length && <Spheres>{spheres}</Spheres>}
    </>
  );
}
