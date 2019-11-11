// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type { PointType, Regl } from "../types";
import { getVertexColors, pointToVec3, withPose } from "../utils/commandUtils";
import { createInstancedGetChildrenForHitmap } from "../utils/getChildrenForHitmapDefaults";
import Command, { type CommonCommandProps } from "./Command";

const points = (regl: Regl) => {
  const [min, max] = regl.limits.pointSizeDims;
  return withPose({
    primitive: "points",
    vert: `
    precision mediump float;

    #WITH_POSE

    uniform mat4 projection, view;
    uniform float pointSize;

    attribute vec3 point;
    attribute vec4 color;
    varying vec4 fragColor;
    void main () {
      gl_PointSize = pointSize;
      vec3 pos = applyPose(point);
      gl_Position = projection * view * vec4(pos, 1);
      fragColor = color;
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
        const size = props.scale.x || 1;
        return Math.min(max, Math.max(min, size));
      },
    },

    count: regl.prop("points.length"),
  });
};

const getChildrenForHitmap = createInstancedGetChildrenForHitmap(1);
export default function Points(props: { ...CommonCommandProps, children: PointType[] }) {
  return <Command getChildrenForHitmap={getChildrenForHitmap} {...props} reglCommand={points} />;
}
