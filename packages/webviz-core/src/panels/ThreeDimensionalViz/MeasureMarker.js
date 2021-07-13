// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import { Lines, Spheres, WorldviewReactContext, type Point } from "regl-worldview";

export type MeasurePoints = {|
  start: ?Point,
  end: ?Point,
|};

type Props = {|
  measurePoints: MeasurePoints,
  cameraDistance: number,
|};

const SPHERE_SIZE_PX = 13;

const defaultPose: any = Object.freeze({ orientation: { x: 0, y: 0, z: 0, w: 1 } });
const defaultSphere: any = Object.freeze({
  type: 2,
  action: 0,
  color: { r: 1, g: 0.2, b: 0, a: 0.75 },
});

export default function MeasureMarker({ measurePoints: { start, end }, cameraDistance }: Props) {
  const { dimension } = React.useContext(WorldviewReactContext);
  const sphere = React.useMemo(() => {
    const size = (cameraDistance / dimension.height) * SPHERE_SIZE_PX;
    return {
      ...defaultSphere,
      scale: { x: size, y: size, z: 0.1 },
    };
  }, [cameraDistance, dimension]);
  const lineSize: number = sphere.scale.x / 3;

  const spheres = [];
  const lines = [];
  if (start) {
    spheres.push({
      ...sphere,
      id: "_measure_start",
      pose: { position: start, ...defaultPose },
    });

    if (end) {
      const endPoint = { ...end };
      lines.push({
        ...sphere,
        id: "_measure_line",
        points: [start, end],
        pose: { ...defaultPose, position: { x: 0, y: 0, z: 0 } },
        scale: { x: lineSize, y: 1, z: 1 },
        type: 4,
      });

      spheres.push({
        ...sphere,
        id: "_measure_end",
        pose: { position: endPoint, ...defaultPose },
      });
    }
  }

  return (
    <>
      {lines.length > 0 && <Lines>{lines}</Lines>}
      {spheres.length > 0 && <Spheres>{spheres}</Spheres>}
    </>
  );
}
