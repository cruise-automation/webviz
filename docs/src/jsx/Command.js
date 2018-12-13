//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import Worldview, { Command, DEFAULT_CAMERA_STATE } from "regl-worldview";

// extend Command
class Triangle extends Command {
  // override getDrawProps - the return value of this function
  // will be passed to the static regl command within the Trangle component
  getDrawProps() {
    return {
      color: this.props.color,
      points: [[-1, 0], [0, -1], [1, 1]],
    };
  }
}

Triangle.displayName = "triangle";

Triangle.defaultProps = {
  color: [1, 0, 0, 1],
};

Triangle.command = () => {
  return {
    vert: `
        precision mediump float;
        attribute vec2 position;
        void main () {
          gl_Position = vec4(position, 0, 1);
        }
        `,
    frag: `
        precision mediump float;
        uniform vec4 color;
        void main () {
          gl_FragColor = color;
        }`,
    attributes: {
      position: (context, props) => props.points,
    },
    uniforms: {
      color: (context, props) => props.color,
    },
    count: (context, props) => props.points.length,
  };
};

function CommandDemo() {
  return (
    <div style={{ height: 500 }}>
      <Worldview defaultCameraState={{ ...DEFAULT_CAMERA_STATE, perspective: true }}>
        <Triangle color={[0, 0, 1, 1]} />
      </Worldview>
    </div>
  );
}

export default CommandDemo;
