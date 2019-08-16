// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { range } from "lodash";
import React from "react";
import {
  Command,
  type CommonCommandProps,
  createInstancedGetChildrenForHitmap,
  withPose,
  type Regl,
} from "regl-worldview";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { LaserScan } from "webviz-core/src/types/Messages";

const laserScan = (regl: Regl) =>
  withPose({
    primitive: "points",
    vert: getGlobalHooks().perPanelHooks().ThreeDimensionalViz.LaserScanVert,
    frag: `
  precision mediump float;
  varying vec4 vColor;
  void main () {
    gl_FragColor = vColor;
  }
  `,

    uniforms: {
      angle_min: regl.prop("angle_min"),
      angle_increment: regl.prop("angle_increment"),
      range_min: regl.prop("range_min"),
      range_max: regl.prop("range_max"),
    },

    attributes: {
      index: (context, props) => range(props.ranges.length),
      range: regl.prop("ranges"),
      intensity: (context, props) =>
        props.intensities.length === props.ranges.length
          ? props.intensities
          : new Float32Array(props.ranges.length).fill(1),
    },

    count: regl.prop("ranges.length"),
  });

export default function LaserScans(props: { ...CommonCommandProps, children: Array<LaserScan> }) {
  return <Command getChildrenForHitmap={createInstancedGetChildrenForHitmap(1)} {...props} reglCommand={laserScan} />;
}
