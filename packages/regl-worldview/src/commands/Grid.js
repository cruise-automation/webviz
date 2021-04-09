// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import { withPose } from "../utils/commandUtils";
import { nonInstancedGetChildrenForHitmap } from "../utils/getChildrenForHitmapDefaults";
import Command, { type CommonCommandProps } from "./Command";

const DEFAULT_GRID_COLOR = [0.3, 0.3, 0.3, 1];

export function grid() {
  return withPose({
    vert: `
    precision mediump float;
    uniform mat4 projection, view;

    attribute vec3 point;
    attribute vec4 color;
    varying vec4 fragColor;

    void main () {
      fragColor = color;
      vec3 p = point;
      gl_Position = projection * view * vec4(p, 1);
    }
    `,
    frag: `
      precision mediump float;
      varying vec4 fragColor;
      void main () {
        gl_FragColor = fragColor;
      }
    `,
    primitive: "lines",
    attributes: {
      point: (context, props) => {
        const points = [];
        const bound = props.count;
        for (let i = -props.count; i < props.count; i++) {
          points.push([-bound, i, 0]);
          points.push([bound, i, 0]);
          points.push([i, -bound, 0]);
          points.push([i, bound, 0]);
        }
        return points;
      },
      color: (context, props) => {
        const color = props.color || DEFAULT_GRID_COLOR;
        return new Array(props.count * 4 * 2).fill(color);
      },
    },
    count: (context, props) => {
      // 8 points per count
      const count = props.count * 4 * 2;
      return count;
    },
  });
}

type Props = {
  ...CommonCommandProps,
  count: number,
};

// useful for rendering a grid for debugging in stories

export default function Grid({ count, ...rest }: Props) {
  const children = { count };
  return (
    <Command getChildrenForHitmap={nonInstancedGetChildrenForHitmap} {...rest} reglCommand={grid}>
      {children}
    </Command>
  );
}

Grid.defaultProps = { count: 6 };
