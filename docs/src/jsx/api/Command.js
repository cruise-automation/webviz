//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import Worldview, { Command } from "regl-worldview";

const reglTriangle = (regl) => ({
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
    position: regl.prop("points"),
  },
  uniforms: {
    color: regl.prop("color"),
  },
  count: regl.prop("points.length"),
});

function Triangle({ color }) {
  return (
    <Command reglCommand={reglTriangle}>
      {{
        color,
        points: [[-1, 0], [0, -1], [1, 1]],
      }}
    </Command>
  );
}

Triangle.defaultProps = {
  color: [1, 0, 0, 1],
};

function Example() {
  return (
    <div style={{ height: 500 }}>
      <Worldview>
        <Triangle color={[0, 0, 1, 1]} />
      </Worldview>
    </div>
  );
}

export default Example;
