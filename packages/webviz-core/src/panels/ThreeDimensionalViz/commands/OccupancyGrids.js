// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { Command, withPose, pointToVec3, defaultBlend, type CommonCommandProps } from "regl-worldview";

import { TextureCache } from "webviz-core/src/panels/ThreeDimensionalViz/commands/utils";
import type { OccupancyGridMessage } from "webviz-core/src/types/Messages";

const getOccupancyGrids = (getMapPalette: (string) => Uint8Array) => (regl: any) => {
  // make a buffer holding the verticies of a 1x1 plane
  // it will be resized in the shader
  const positionBuffer = regl.buffer([0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0]);

  const cache = new TextureCache(regl);
  const paletteTextures = new Map<Uint8Array, any>();

  return withPose({
    primitive: "triangle strip",

    vert: `
    precision lowp float;

    uniform mat4 projection, view;
    uniform vec3 offset;
    uniform vec4 orientation;
    uniform float width, height, resolution, alpha;

    attribute vec3 point;

    #WITH_POSE

    varying vec2 uv;
    varying float vAlpha;

    void main () {
      // set the texture uv to the unscaled vertext point
      uv = vec2(point.x, point.y);

      // compute the plane vertex dimensions
      float planeWidth = width * resolution;
      float planeHeight = height * resolution;

      // rotate the point by the ogrid orientation & scale the point by the plane vertex dimensions
      vec3 position = rotate(point, orientation) * vec3(planeWidth, planeHeight, 1.);

      // move the vertex by the marker offset
      vec3 loc = applyPose(position + offset);
      vAlpha = alpha;
      gl_Position = projection * view * vec4(loc, 1);
    }
    `,
    frag: `
    precision lowp float;

    varying vec2 uv;
    varying float vAlpha;

    uniform sampler2D palette;
    uniform sampler2D data;

    void main () {
      // look up the point in our data texture corresponding to
      // the current point being shaded
      vec4 point = texture2D(data, uv);

      // vec2(point.a, 0.5) is similar to textelFetch for webGL 1.0
      // it looks up a point along our 1 dimentional palette
      // http://www.lighthouse3d.com/tutorials/glsl-tutorial/texture-coordinates/
      gl_FragColor = texture2D(palette, vec2(point.a, 0.5));
      gl_FragColor.a *= vAlpha;
    }
    `,
    blend: defaultBlend,

    depth: { enable: true, mask: false },

    attributes: {
      point: positionBuffer,
    },

    uniforms: {
      width: regl.prop("info.width"),
      height: regl.prop("info.height"),
      resolution: regl.prop("info.resolution"),
      // make alpha a uniform so in the future it can be controlled by topic settings
      alpha: (context: any, props: OccupancyGridMessage) => {
        return props.alpha || 0.5;
      },
      offset: (context: any, props: OccupancyGridMessage) => {
        return pointToVec3(props.info.origin.position);
      },
      orientation: (context: any, props: OccupancyGridMessage) => {
        const { x, y, z, w } = props.info.origin.orientation;
        return [x, y, z, w];
      },
      palette: (context: any, props: OccupancyGridMessage) => {
        const palette = getMapPalette(props.map);
        // track which palettes we've uploaded as textures
        let texture = paletteTextures.get(palette);
        if (texture) {
          return texture;
        }
        // if we haven't already uploaded this palette, upload it to the GPU
        texture = regl.texture({
          format: "rgba",
          type: "uint8",
          mipmap: false,
          data: palette,
          width: 256,
          height: 1,
        });
        paletteTextures.set(palette, texture);
        return texture;
      },
      data: (context: any, props: any) => {
        return cache.get(props);
      },
    },

    count: 4,
  });
};

type Props = {
  ...CommonCommandProps,
  getMapPalette: (string) => Uint8Array,
  children: OccupancyGridMessage[],
};

export default function OccupancyGrids(props: Props) {
  // We can click through OccupancyGrids.
  const command = React.useMemo(() => getOccupancyGrids(props.getMapPalette), [props.getMapPalette]);
  return <Command getChildrenForHitmap={null} {...props} reglCommand={command} />;
}
