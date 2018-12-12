// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Command from './Command';
import { withPose } from '../utils/commandUtils';

export function grid() {
  return withPose({
    vert: `
    precision mediump float;
    uniform mat4 projection, view;

    attribute vec3 point;

    void main () {
      vec3 p = point;
      gl_Position = projection * view * vec4(p, 1);
    }
    `,
    frag: `
      precision mediump float;
      void main () {
        gl_FragColor = vec4(1., 1., 1., 1.);
      }
    `,
    primitive: 'lines',
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
    },
    count: (context, props) => {
      // 6 points per count
      const count = props.count * 4 * 2;
      return count;
    },
  });
}

type Props = {
  layerIndex?: ?number,
  count: number,
};

// useful for rendering a grid for debugging in stories
export default class Grid extends Command<Props> {
  static displayName = 'Grid';
  static command = grid;
  static defaultProps = {
    count: 6,
  };

  getDrawProps() {
    return this.props;
  }
}
