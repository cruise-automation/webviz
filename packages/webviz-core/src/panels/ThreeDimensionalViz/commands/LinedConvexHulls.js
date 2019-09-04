// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import flatMap from "lodash/flatMap";
import uniqBy from "lodash/uniqBy";
import qh from "quickhull3d";
import * as React from "react";
import {
  Triangles,
  Lines,
  type Line,
  type CommonCommandProps,
  getChildrenForHitmapWithOriginalMarker,
  nonInstancedGetChildrenForHitmap,
  shouldConvert,
  pointToVec3,
  vec4ToRGBA,
} from "regl-worldview";

type Props = {
  children: Array<Line>,
  opacity: number,
  ...CommonCommandProps,
};

export default function LinedConvexHulls({ children, opacity, ...rest }: Props) {
  const triangles = children
    .map((line) => {
      // Make sure all points are in vec3 format and unique.
      const points = uniqBy(
        line.points.map((point) => (shouldConvert(point) ? pointToVec3(point) : point)),
        ([x, y, z]) => `${x}:${y}:${z}`
      );
      // We need a minimum of 4 points to do the convex hull algorithm.
      if (points.length < 4) {
        return null;
      }
      // Try to run hulling on the face indices. If there is an error, discard the result.
      let faceIndices;
      try {
        faceIndices = qh(points);
      } catch (error) {
        console.error(error);
        return null;
      }

      // From the point indices of each face, find the points and flatmap to get the points of the triangles.
      const trianglePoints = flatMap(faceIndices, ([index1, index2, index3]) => {
        return [points[index1], points[index2], points[index3]];
      });
      const convertedColor = typeof line.color.r === "number" ? line.color : vec4ToRGBA(line.color);
      const colorWithAlpha = { ...convertedColor, a: opacity };
      return {
        pose: line.pose,
        scale: line.scale,
        color: colorWithAlpha,
        points: trianglePoints,
        originalMarker: line,
      };
    })
    .filter(Boolean);

  return (
    <React.Fragment>
      {/* Render all the lines, even if we can't generate a convex hull from them. */}
      <Lines getChildrenForHitmap={nonInstancedGetChildrenForHitmap} {...rest}>
        {children}
      </Lines>
      <Triangles getChildrenForHitmap={getChildrenForHitmapWithOriginalMarker} {...rest}>
        {triangles}
      </Triangles>
    </React.Fragment>
  );
}
