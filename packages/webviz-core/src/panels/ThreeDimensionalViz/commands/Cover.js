// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React from "react";
import { Command } from "regl-worldview";

import type { ReglColor } from "webviz-core/src/util/colorUtils";

const reglCommand = (regl) => ({
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
  blend: {
    enable: true,
    func: {
      src: "src alpha",
      dst: "one minus src alpha",
    },
  },
  depth: {
    enable: false,
  },
});

export default function Cover({ color, layerIndex }: { color: ReglColor, layerIndex?: number }) {
  // Two triangles covering the entire screen
  const points = [[-1, -1], [-1, 1], [1, 1], [-1, -1], [1, -1], [1, 1]];
  return (
    <Command reglCommand={reglCommand} layerIndex={layerIndex}>
      {{ color, points }}
    </Command>
  );
}
