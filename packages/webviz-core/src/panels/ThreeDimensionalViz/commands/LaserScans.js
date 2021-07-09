// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { range } from "lodash";
import * as React from "react";
import {
  Command,
  withPose,
  toRGBA,
  type Regl,
  type CommonCommandProps,
  nonInstancedGetChildrenForHitmap,
} from "regl-worldview";

import type { LaserScan } from "webviz-core/src/types/Messages";

export const DEFAULT_FLAT_COLOR = { r: 0.5, g: 0.5, b: 1, a: 1 };

const getLaserScan = (vert) => (regl: Regl) =>
  withPose({
    primitive: "points",
    vert,
    frag: `
  precision mediump float;
  varying vec4 vColor;
  uniform bool isCircle;
  void main () {
    if (isCircle && length(gl_PointCoord * 2.0 - 1.0) > 1.0) {
      discard;
    }

    gl_FragColor = vColor;
  }
  `,

    uniforms: {
      pointSize: (context, props) => (props.settings && props.settings.pointSize) || 4,
      isCircle: (context, props) => (props.settings && props.settings.pointShape === "circle") || false,
      // Color is not included in the LaserScan message - it's only included if the color is added by
      // getChildrenForHitmap.
      isHitmap: (context, props) => !!props.color,

      angle_min: regl.prop("angle_min"),
      angle_increment: regl.prop("angle_increment"),
      range_min: regl.prop("range_min"),
      range_max: regl.prop("range_max"),

      color: (context, props) => toRGBA(props.settings?.overrideColor || DEFAULT_FLAT_COLOR),
    },

    attributes: {
      index: (context, props) => range(props.ranges.length),
      range: regl.prop("ranges"),
      intensity: (context, props) =>
        props.intensities.length === props.ranges.length
          ? props.intensities
          : new Float32Array(props.ranges.length).fill(1),
      hitmapColor: (context, props) => {
        let color = [0, 0, 0, 1];
        if (props.color) {
          color = Array.isArray(props.color) ? props.color : toRGBA(props.color);
        }
        return new Array(props.ranges.length).fill(color);
      },
    },

    count: regl.prop("ranges.length"),
  });

type Props = {
  ...CommonCommandProps,
  laserScanVert: string,
  children: LaserScan[],
};

export default function LaserScans(props: Props) {
  const command = React.useMemo(() => getLaserScan(props.laserScanVert), [props.laserScanVert]);
  return <Command getChildrenForHitmap={nonInstancedGetChildrenForHitmap} {...props} reglCommand={command} />;
}
