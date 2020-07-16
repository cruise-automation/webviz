// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import type { Regl, TriangleList } from "../types";
import {
  defaultBlend,
  getVertexColors,
  pointToVec3Array,
  shouldConvert,
  toRGBA,
  withPose,
} from "../utils/commandUtils";
import { createInstancedGetChildrenForHitmap } from "../utils/getChildrenForHitmapDefaults";
import Command, { type CommonCommandProps } from "./Command";

// TODO(Audrey): default to the actual regl defaults before 1.x release
const defaultSingleColorDepth = { enable: true, mask: false };
const defaultVetexColorDepth = {
  enable: true,
  mask: true,
  func: "<=",
};

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
    },
    uniforms: {
      color: (context, props) => {
        if (shouldConvert(props.color)) {
          return toRGBA(props.color);
        }
        return props.color;
      },
    },
    // can pass in { enable: true, depth: false } to turn off depth to prevent flicker
    // because multiple items are rendered to the same z plane
    depth: {
      enable: (context, props) => {
        return (props.depth && props.depth.enable) || defaultSingleColorDepth.enable;
      },
      mask: (context, props) => {
        return (props.depth && props.depth.mask) || defaultSingleColorDepth.mask;
      },
    },
    blend: defaultBlend,

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
        if (!props.colors || !props.colors.length) {
          throw new Error(`Invalid empty or null prop "colors" when rendering triangles using vertex colors`);
        }
        if (shouldConvert(props.colors)) {
          return getVertexColors(props);
        }
        return props.colors;
      },
    },

    depth: {
      enable: (context, props) => {
        return (props.depth && props.depth.enable) || defaultVetexColorDepth.enable;
      },
      mask: (context, props) => {
        return (props.depth && props.depth.mask) || defaultVetexColorDepth.mask;
      },
    },
    blend: defaultBlend,

    count: (context, props) => props.points.length,
  });

// command to render triangle lists optionally supporting vertex colors for each triangle
const triangles = (regl: Regl) => {
  const single = regl(singleColor(regl));
  const vertex = regl(vertexColors(regl));
  return (props: any, isHitmap: boolean) => {
    const items: TriangleList[] = Array.isArray(props) ? props : [props];
    const singleColorItems = [];
    const vertexColorItems = [];
    items.forEach((item) => {
      // If the item has onlyRenderInHitmap set, only render it in the hitmap.
      if (isHitmap || !item.onlyRenderInHitmap) {
        if (item.colors && item.colors.length) {
          vertexColorItems.push(item);
        } else {
          singleColorItems.push(item);
        }
      }
    });

    single(singleColorItems);
    vertex(vertexColorItems);
  };
};

const getChildrenForHitmap = createInstancedGetChildrenForHitmap(3);
export default function Triangles(props: { ...CommonCommandProps, children: TriangleList[] }) {
  return <Command getChildrenForHitmap={getChildrenForHitmap} {...props} reglCommand={triangles} />;
}
