// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Color, Point, Orientation, ReglCommand, Vec4, Vec3 } from "../types";

const rotateGLSL = `
  uniform vec3 _position;
  uniform vec4 _rotation;

  // rotate a 3d point v by a rotation quaternion q
  vec3 rotate(vec3 v, vec4 q) {
    vec3 temp = cross(q.xyz, v) + q.w * v;
    return v + (2.0 * cross(q.xyz, temp));
  }

  vec3 applyPose(vec3 point) {
    // rotate the point and then add the position of the pose
    return rotate(point, _rotation) + _position;
  }
`;

const DEFAULT_TEXT_COLOR = { r: 1, g: 1, b: 1, a: 1 };

export const pointToVec3 = ({ x, y, z }: Point): Vec3 => {
  return [x, y, z];
};
export const orientationToVec4 = ({ x, y, z, w }: Orientation): Vec4 => {
  return [x, y, z, w];
};

export const vec3ToPoint = ([x, y, z]: Vec3): Point => ({ x, y, z });

export const vec4ToOrientation = ([x, y, z, w]: Vec4): Orientation => ({ x, y, z, w });

export const pointToVec3Array = (points: Point[]) => {
  const result = new Float32Array(points.length * 3);
  let i = 0;
  for (const { x, y, z } of points) {
    result[i++] = x;
    result[i++] = y;
    result[i++] = z;
  }
  return result;
};

export const toRGBA = (val: Color) => {
  return [val.r, val.g, val.b, val.a];
};

export const vec4ToRGBA = (color: Vec4): Color => ({ r: color[0], g: color[1], b: color[2], a: color[3] });

export const toColor = (val: Color | Vec4): Color => (Array.isArray(val) ? vec4ToRGBA(val) : val);

export function getCSSColor(color: Color = DEFAULT_TEXT_COLOR) {
  const { r, g, b, a } = color;
  return `rgba(${(r * 255).toFixed()}, ${(g * 255).toFixed()}, ${(b * 255).toFixed()}, ${a.toFixed(3)})`;
}

const toRGBAArray = (colors: $ReadOnlyArray<Color>): Float32Array => {
  const result = new Float32Array(colors.length * 4);
  let i = 0;
  for (const { r, g, b, a } of colors) {
    result[i++] = r;
    result[i++] = g;
    result[i++] = b;
    result[i++] = a;
  }
  return result;
};

const constantRGBAArray = (count: number, { r, g, b, a }: Color): Float32Array => {
  const result = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    result[4 * i + 0] = r;
    result[4 * i + 1] = g;
    result[4 * i + 2] = b;
    result[4 * i + 3] = a;
  }
  return result;
};

// default blend func params to be mixed into regl commands
export const defaultReglBlend = {
  enable: true,
  // this is the same gl.BlendFunc used by three.js by default
  func: {
    src: "src alpha",
    dst: "one minus src alpha",
    srcAlpha: 1,
    dstAlpha: "one minus src alpha",
  },
  equation: {
    rgb: "add",
    alpha: "add",
  },
};

export const defaultReglDepth = {
  enable: true,
  mask: true,
};

export const defaultDepth = {
  enable: (context: any, props: any) => (props.depth && props.depth.enable) || defaultReglDepth.enable,
  mask: (context: any, props: any) => (props.depth && props.depth.mask) || defaultReglDepth.mask,
};

export const defaultBlend = {
  ...defaultReglBlend,
  enable: (context: any, props: any) => (props.blend && props.blend.enable) || defaultReglBlend.enable,
  func: (context: any, props: any) => (props.blend && props.blend.func) || defaultReglBlend.func,
};

// TODO: deprecating, remove before 1.x release
export const blend = defaultBlend;

// takes a regl command definition object and injects
// position and rotation from the object pose and also
// inserts some glsl helpers to apply the pose to points in a fragment shader
export function withPose(command: ReglCommand): ReglCommand {
  const { vert, uniforms } = command;
  const newVert = vert.replace("#WITH_POSE", rotateGLSL);
  const newUniforms = {
    ...uniforms,
    _position: (context, props) => {
      const { position } = props.pose;
      return Array.isArray(position) ? position : pointToVec3(position);
    },
    _rotation: (context, props) => {
      const { orientation: r } = props.pose;
      return Array.isArray(r) ? r : [r.x, r.y, r.z, r.w];
    },
  };
  return {
    ...command,
    vert: newVert,
    uniforms: newUniforms,
  };
}

export function getVertexColors({
  colors,
  color,
  points,
}: {
  colors?: $ReadOnlyArray<Color> | $ReadOnlyArray<Vec4>,
  color: Color,
  points: $ReadOnlyArray<Point>,
}): Float32Array | $ReadOnlyArray<Vec4> {
  if ((!colors || !colors.length) && color) {
    return constantRGBAArray(points.length, color);
  }
  if (colors) {
    // $FlowFixMe this will go away once we consolidate getVertexColors and colorBuffer
    return shouldConvert(colors) ? toRGBAArray(colors) : colors;
  }
  return [];
}

function hasNestedArrays(arr: any[]) {
  return arr.length && Array.isArray(arr[0]);
}

// Returns a function which accepts a single color, an array of colors, and the number of instances,
// and returns a color attribute buffer for use in regl.
// If there are multiple colors in the colors array, one color will be assigned to each instance.
// In the case of a single color, the same color will be used for all instances.
export function colorBuffer(regl: any) {
  const buffer = regl.buffer({
    usage: "dynamic",
    data: [],
  });

  return function(color: any, colors: any, length: number) {
    let data, divisor;
    if (!colors || !colors.length) {
      data = shouldConvert(color) ? toRGBA(color) : color;
      divisor = length;
    } else {
      data = shouldConvert(colors) ? toRGBAArray(colors) : colors;
      divisor = 1;
    }
    return {
      buffer: buffer({
        usage: "dynamic",
        data,
      }),
      divisor,
    };
  };
}

// used to determine if the input/array of inputs is an object like {r: 0, g: 0, b: 0} or [0,0,0]
export function shouldConvert(props: any) {
  if (!props || hasNestedArrays(props) || !isNaN(props[0])) {
    return false;
  }
  return true;
}

export function intToRGB(i: number = 0): Vec4 {
  const r = ((i >> 16) & 255) / 255;
  const g = ((i >> 8) & 255) / 255;
  const b = (i & 255) / 255;
  return [r, g, b, 1];
}

export function getIdFromColor(rgb: Vec4): number {
  const r = rgb[0] * 255;
  const g = rgb[1] * 255;
  const b = rgb[2] * 255;
  return b | (g << 8) | (r << 16);
}

export function getIdFromPixel(rgb: Uint8Array): number {
  const r = rgb[0];
  const g = rgb[1];
  const b = rgb[2];
  return b | (g << 8) | (r << 16);
}

// gl-matrix clone of three.js Vector3.setFromSpherical
// phi: polar angle (between poles, 0 - pi)
// theta: azimuthal angle (around equator, 0 - 2pi)
export function fromSpherical(out: number[], r: number, theta: number, phi: number): Vec3 {
  const rSinPhi = r * Math.sin(phi);
  out[0] = rSinPhi * Math.sin(theta);
  out[1] = r * Math.cos(phi);
  out[2] = rSinPhi * Math.cos(theta);
  return (out: any);
}
