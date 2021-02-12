// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import memoize from "lodash/memoize";
import React from "react";
import { Command } from "regl-worldview";

import type { ReglColor } from "webviz-core/src/util/colorUtils";

const makeReglCommand = memoize(
  ({ overwriteDepthBuffer }: { overwriteDepthBuffer?: boolean }) => (regl) => ({
    vert: `
      precision mediump float;
      attribute vec2 position;
      void main () {
        gl_Position = vec4(position, 1, 1);
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
      // If overwriteDepthBuffer is enabled, we will always
      // write to the depth buffer with a "far away" value of 1.
      // The result is similar to calling regl.clear({ depth: 1 }).
      enable: overwriteDepthBuffer ?? false,
      func: "always",
    },
  }),
  (...args) => JSON.stringify(args)
);

export default function Cover({
  color,
  layerIndex,
  overwriteDepthBuffer,
}: {
  color: ReglColor,
  layerIndex?: number,

  // When enabled, the cover will overwrite the depth buffer when it is drawn.
  // This is useful if you'd like to draw new content on top of the Cover.
  overwriteDepthBuffer?: boolean,
}) {
  // Two triangles covering the entire screen
  const points = [[-1, -1], [-1, 1], [1, 1], [-1, -1], [1, -1], [1, 1]];
  return (
    <Command reglCommand={makeReglCommand({ overwriteDepthBuffer })} layerIndex={layerIndex}>
      {{ color, points }}
    </Command>
  );
}
