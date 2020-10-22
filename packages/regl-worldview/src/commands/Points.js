// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";

import type { PointType, Regl } from "../types";
import { getVertexColors, pointToVec3, withPose } from "../utils/commandUtils";
import { createInstancedGetChildrenForHitmap } from "../utils/getChildrenForHitmapDefaults";
import Command, { type CommonCommandProps } from "./Command";

type Props = {
  ...CommonCommandProps,
  useWorldSpaceSize?: boolean,
  children: $ReadOnlyArray<PointType>,
};

const makePointsCommand = (useWorldSpaceSize: boolean) => {
  return (regl: Regl) => {
    const [minLimitPointSize, maxLimitPointSize] = regl.limits.pointSizeDims;
    return withPose({
      primitive: "points",
      vert: `
    precision mediump float;

    #WITH_POSE

    uniform mat4 projection, view;
    uniform float pointSize;
    uniform bool useWorldSpaceSize;
    uniform float viewportWidth;
    uniform float viewportHeight;
    uniform float minPointSize;
    uniform float maxPointSize;

    attribute vec3 point;
    attribute vec4 color;
    varying vec4 fragColor;
    void main () {
      vec3 pos = applyPose(point);
      gl_Position = projection * view * vec4(pos, 1);
      fragColor = color;

      if (useWorldSpaceSize) {
        // Calculate the point size based on world dimensions:
        // First, we need to compute a new point that is one unit away from
        // the center of the current point being rendered. We do it in view space
        // in order to make sure the new point is always one unit up and it's not
        // affected by view rotation.
        vec4 up = projection * (view * vec4(pos, 1.0) + vec4(0.0, 1.0, 0.0, 0.0));

        // Then, we compute the distance between both points in clip space, dividing
        // by the w-component to account for distance in perspective projection.
        float d = length(up.xyz / up.w - gl_Position.xyz / gl_Position.w);

        // Finally, the point size is calculated using the size of the render target
        // and it's aspect ratio. We multiply it by 0.5 since distance in clip space
        // is in range [0, 2] (because clip space's range is [-1, 1]) and
        // we need it to be [0, 1].
        float invAspect = viewportHeight / viewportWidth;
        gl_PointSize = pointSize * 0.5 * d * viewportWidth * invAspect;
      } else {
        gl_PointSize = pointSize;
      }

      // Finally, ensure the calculated point size is within the limits.
      gl_PointSize = min(maxPointSize, max(minPointSize, gl_PointSize));
    }
    `,
      frag: `
    precision mediump float;
    varying vec4 fragColor;
    void main () {
      gl_FragColor = vec4(fragColor.x, fragColor.y, fragColor.z, 1);
    }
    `,
      attributes: {
        point: (context, props) => {
          return props.points.map((point) => (Array.isArray(point) ? point : pointToVec3(point)));
        },
        color: (context, props) => {
          const colors = getVertexColors(props);
          return colors;
        },
      },

      uniforms: {
        pointSize: (context, props) => {
          return props.scale.x || 1;
        },
        useWorldSpaceSize,
        viewportWidth: regl.context("viewportWidth"),
        viewportHeight: regl.context("viewportHeight"),
        minPointSize: minLimitPointSize,
        maxPointSize: maxLimitPointSize,
      },

      count: regl.prop("points.length"),
    });
  };
};

const getChildrenForHitmap = createInstancedGetChildrenForHitmap(1);
export default function Points(props: Props) {
  const [command] = useState(() => makePointsCommand(!!props.useWorldSpaceSize));
  return <Command getChildrenForHitmap={getChildrenForHitmap} {...props} reglCommand={command} />;
}
