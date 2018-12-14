// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { TriangleList, Regl } from "../types";
import { blend, pointToVec3Array, withPose, getVertexColors, shouldConvert, toRGBA } from "../utils/commandUtils";
import { makeCommand } from "./Command";

const singleColor = (regl) =>
  withPose({
    primitive: "triangles",
    vert: `
  precision mediump float;

  attribute vec3 point;

  uniform mat4 projection, view;

  #WITH_POSE

  void main () {
    vec3 pos = applyPose(point);
    gl_Position = projection * view * vec4(pos, 1);
  }
  `,
    frag: `
  precision mediump float;
  uniform vec4 color;
  void main () {
    gl_FragColor = color;
  }
  `,
    attributes: {
      point: (context, props) => {
        if (shouldConvert(props.points)) {
          return pointToVec3Array(props.points);
        }
        return props.points;
      },
      color: (context, props) => {
        if (shouldConvert(props.colors) || shouldConvert(props.color)) {
          return getVertexColors(props);
        }
        return props.color || props.colors;
      },
    },
    uniforms: {
      color: (context, props) => {
        if (shouldConvert(props.color)) {
          return toRGBA(props.color);
        }
        return props.color;
      },
    },

    // turn off depth to prevent flicker
    // because multiple items are rendered to the same z plane
    depth: { enable: true, mask: false },
    blend,

    count: (context, props) => props.points.length,
  });

const vertexColors = (regl) =>
  withPose({
    primitive: "triangles",
    vert: `
  precision mediump float;

  attribute vec3 point;
  attribute vec4 color;

  uniform mat4 projection, view;

  varying vec4 vColor;

  #WITH_POSE

  void main () {
    vec3 pos = applyPose(point);
    vColor = color;
    gl_Position = projection * view * vec4(pos, 1);
  }
  `,
    frag: `
  precision mediump float;
  varying vec4 vColor;
  void main () {
    gl_FragColor = vColor;
  }
  `,
    attributes: {
      point: (context, props) => {
        if (shouldConvert(props.points)) {
          return pointToVec3Array(props.points);
        }
        return props.points;
      },
      color: (context, props) => {
        if (shouldConvert(props.colors) || shouldConvert(props.color)) {
          return getVertexColors(props);
        }
        return props.color || props.colors;
      },
    },

    blend,
    depth: {
      enable: true,
      func: "<=",
    },

    count: (context, props) => props.points.length,
  });

// command to render triangle lists optionally supporting vertex colors for each triangle
const triangles = (regl: Regl) => {
  const single = regl(singleColor(regl));
  const vertex = regl(vertexColors(regl));
  return (props: any) => {
    const items = Array.isArray(props) ? props : [props];
    const singleColorItems = [];
    const vertexColorItems = [];
    items.forEach((item) => {
      if (item.colors && item.colors.length) {
        vertexColorItems.push(item);
      } else {
        singleColorItems.push(item);
      }
    });

    single(singleColorItems);
    vertex(vertexColorItems);
  };
};

// prettier-ignore
const Triangles = makeCommand<TriangleList>('Triangles', triangles);

export default Triangles;
