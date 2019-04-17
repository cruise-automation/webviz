// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Line } from "../types";
import { defaultBlend, withPose, toRGBA, shouldConvert, pointToVec3 } from "../utils/commandUtils";
import {
  getHitmapPropsForInstancedCommands as getHitmapProps,
  getObjectForInstancedCommands as getObjectFromHitmapId,
} from "../utils/hitmapDefaults";
import { makeCommand } from "./Command";

/*
Triangle-based line drawing.

4 points (a strip of 2 triangles) are drawn for each segment of the line using instanced arrays.
Each of the 4 points has a distinct "point type" which informs how the input point is offset to
yield the vertices of the triangle.

Passing the input point as an attribute with {divisor: 1} tells GL to use each point for 1 instance,
then move on to the next point -- something like `points.map((p) => draw2Triangles(p))`.

4 attributes are used so the vertex shader can see 4 input points at once (reading from the same
buffer with different offsets). This is because the positions of the TL/BL endpoints depend on the
angle ABC, and the positions of TR/BR depend on the angle BCD.

Roughly the segment looks like:

     TL   -   -   -  .TR
      |          ,.-' |
A - - B - - -,.-' - - C - - D
      |  ,.-'         |
     BL-' -   -   -   BR

When two adjacent segments form an obtuse angle, we draw a miter join:

                      TR/TL.
                 , '   _/|   ' .
             , '     _/  |       ' .
         , '       _/    C           ' .
     , '         _/      |               ' .
   TL          _/        |        ______,----'TR
    \        _/       ,BR/BL.----'            /
     B     _/    , '          ' .            D
      \  _/ , '                   ' .       /
       BL'                            ' . BR

But when the angle gets too sharp, we switch to a "fold" join, where the two segments overlap at
the corner:

        ,TR/BL---C--BR/TL
       ,    |.\__  ,     .
      ,     | .  \,_      .
     ,      |  . ,  \_     .
    ,       |   ,     \__   .
   ,        |  , .       \__ .
  TL._      | ,   .        _.TR
      'B._  |,     .   _.C'
          'BL       BR'

(A regular bevel join without any overlaps is harder to achieve without artifacts in the sharp-angle
edge cases.)

*/

const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;
const POINT_BYTES = 3 * FLOAT_BYTES;
const DEFAULT_MONOCHROME_COLOR = [1, 1, 1, 0.2];

// The four points forming the triangles' vertices.
// Values do not matter, they just need to be distinct.
const POINT_TYPES = { BL: 0, TR: 1, BR: 2, TL: 3 };
const VERTICES_PER_INSTANCE = Object.keys(POINT_TYPES).length;

const vert = `
precision mediump float;

attribute float pointType;

// per-instance attributes
attribute vec4 colorB;
attribute vec4 colorC;
attribute vec3 positionA;
attribute vec3 positionB;
attribute vec3 positionC;
attribute vec3 positionD;

uniform mat4 projection, view;
uniform float viewportWidth;
uniform float viewportHeight;
uniform float alpha;
uniform float thickness;
uniform bool joined;
uniform bool scaleInvariant;

varying vec4 vColor;

${Object.keys(POINT_TYPES)
  .map((k) => `const float POINT_${k} = ${POINT_TYPES[k]}.0;`)
  .join("\n")}

#WITH_POSE

vec2 rotateCCW(vec2 v) {
  return vec2(-v.y, v.x);
}

vec2 normalizeOrZero(vec2 v) {
  return length(v) < 0.00001 ? vec2(0, 0) : normalize(v);
}

void setPosition(vec4 proj, vec2 offset) {
  gl_Position = proj;

  offset *= thickness / 2.;

  if (scaleInvariant) {
    // The given thickness is a number of pixels on screen. Divide x by width/2 and
    // y by height/2 so that they correspond to pixel distances when scaled from clip space to NDC.
    offset.x /= viewportWidth / 2.0;
    offset.y /= viewportHeight / 2.0;
    // Compensate for automatic division by w
    offset *= proj.w;
  } else {
    // The line thickness should be scaled the same way the camera scales other distances.
    // projection[0].xyz is the result of projecting a unit x-vector, so its length represents
    // how much distances are scaled by the camera projection.
    offset *= length(projection[0].xyz);
    offset.y *= viewportWidth / viewportHeight;
  }

  gl_Position.xy += offset;
}

void main () {
  bool isStart = positionA == positionB;
  bool isEnd = positionC == positionD;
  bool isLeft = (pointType == POINT_TL || pointType == POINT_BL);
  bool isTop = (pointType == POINT_TL || pointType == POINT_TR);
  bool isEndpoint = isLeft ? isStart : isEnd;

  float scale = isTop ? 1. : -1.;

  mat4 projView = projection * view;
  vec4 projA = projView * vec4(applyPose(positionA), 1);
  vec4 projB = projView * vec4(applyPose(positionB), 1);
  vec4 projC = projView * vec4(applyPose(positionC), 1);
  vec4 projD = projView * vec4(applyPose(positionD), 1);

  vec2 aspectVec = vec2(viewportWidth / viewportHeight, 1.0);
  vec2 screenA = projA.xy / projA.w * aspectVec;
  vec2 screenB = projB.xy / projB.w * aspectVec;
  vec2 screenC = projC.xy / projC.w * aspectVec;
  vec2 screenD = projD.xy / projD.w * aspectVec;

  vec2 dirAB = normalizeOrZero(screenB - screenA);
  vec2 dirBC = normalizeOrZero(screenC - screenB);
  vec2 dirCD = normalizeOrZero(screenD - screenC);

  vec2 perpAB = rotateCCW(dirAB); // vector perpendicular to AB
  vec2 perpBC = rotateCCW(dirBC); // vector perpendicular to BC

  vColor = isLeft ? colorB : colorC;
  vColor.a *= alpha;

  vec4 proj = isLeft ? projB : projC;

  // simple case: non-joined line list
  if (!joined || isEndpoint) {
    setPosition(proj, scale * perpBC);
    return;
  }

  // clamp to prevent rounding errors from breaking the sqrt()s below
  float cosB = clamp(-dot(dirAB, dirBC), -1., 1.);
  float cosC = clamp(-dot(dirBC, dirCD), -1., 1.);

  bool tooSharpB = cosB > 0.01;
  bool tooSharpC = cosC > 0.01;
  bool tooSharp = isLeft ? tooSharpB : tooSharpC;

  bool turningRightB = dot(dirAB, rotateCCW(dirBC)) > 0.;
  bool turningRightC = dot(dirBC, rotateCCW(dirCD)) > 0.;
  bool turningRight = isLeft ? turningRightB : turningRightC;

  if (tooSharp) {
    // "fold join"
    vec2 perp = isLeft ? perpAB : perpBC;
    vec2 dir = isLeft ? dirAB : dirBC;
    float scalePerp = isLeft ? -1. : 1.;
    float scaleDir = (turningRight == isLeft) ? 1. : -1.;
    float tanHalfB = sqrt((1. - cosB) / (1. + cosB));
    float tanHalfC = sqrt((1. - cosC) / (1. + cosC));
    float tanHalf = isLeft ? tanHalfB : tanHalfC;
    setPosition(proj, scale * (scalePerp * perp + scaleDir * dir * tanHalf));
  } else {
    // miter join
    vec2 bisectorB = rotateCCW(normalize(dirAB + dirBC)); // angle bisector of ABC
    vec2 bisectorC = rotateCCW(normalize(dirBC + dirCD)); // angle bisector of BCD
    vec2 bisector = isLeft ? bisectorB : bisectorC;
    float sinHalfB = sqrt((1. - cosB) / 2.);
    float sinHalfC = sqrt((1. - cosC) / 2.);
    float sinHalf = isLeft ? sinHalfB : sinHalfC;
    setPosition(proj, scale * bisector / sinHalf);
  }
}
`;

const frag = `
precision mediump float;
varying vec4 vColor;
void main () {
  gl_FragColor = vColor;
}
`;

function pointsEqual(a, b) {
  const [ax, ay, az] = shouldConvert(a) ? pointToVec3(a) : a;
  const [bx, by, bz] = shouldConvert(b) ? pointToVec3(b) : b;
  return ax === bx && ay === by && az === bz;
}

const lines = (regl: any) => {
  // The point type attribute, reused for each instance
  const pointTypeBuffer = regl.buffer({
    type: "uint16",
    usage: "static",
    data: [POINT_TYPES.TL, POINT_TYPES.BL, POINT_TYPES.TR, POINT_TYPES.BR],
  });
  const debugColorBuffer = regl.buffer({
    type: "float",
    usage: "static",
    data: [
      [0, 1, 1, 1], // cyan
      [1, 0, 0, 1], // red
      [0, 1, 0, 1], // green
      [1, 0, 1, 1], // magenta
    ],
  });

  // The buffers used for input position & color data
  const colorBuffer = regl.buffer({ type: "float" });

  // All invocations of the vertex shader share data from the positions buffer, but with different
  // offsets. However, when offset and stride are combined, 3 or 4 attributes reading from the same
  // buffer produces incorrect results on certain Lenovo hardware running Ubuntu. As a workaround,
  // we upload the same data into two buffers and have only two attributes reading from each buffer.
  const positionBuffer1 = regl.buffer({ type: "float" });
  const positionBuffer2 = regl.buffer({ type: "float" });

  const command = regl(
    withPose({
      vert,
      frag,
      blend: defaultBlend,
      uniforms: {
        thickness: regl.prop("scale.x"),
        viewportWidth: regl.context("viewportWidth"),
        viewportHeight: regl.context("viewportHeight"),
        alpha: regl.prop("alpha"),
        joined: regl.prop("joined"),
        scaleInvariant: regl.prop("scaleInvariant"),
      },
      attributes: {
        pointType: pointTypeBuffer,
        colorB: (context, { joined, monochrome, debug }) => ({
          buffer: debug ? debugColorBuffer : colorBuffer,
          offset: 0,
          stride: (joined || monochrome || debug ? 1 : 2) * 4 * FLOAT_BYTES,
          divisor: monochrome || debug ? 0 : 1,
        }),
        colorC: (context, { joined, monochrome, debug }) => ({
          buffer: debug ? debugColorBuffer : colorBuffer,
          offset: monochrome || debug ? 0 : 4 * FLOAT_BYTES,
          stride: (joined || monochrome || debug ? 1 : 2) * 4 * FLOAT_BYTES,
          divisor: monochrome || debug ? 0 : 1,
        }),
        positionA: (context, { joined }) => ({
          buffer: positionBuffer1,
          offset: 0,
          stride: (joined ? 1 : 2) * POINT_BYTES,
          divisor: 1,
        }),
        positionB: (context, { joined }) => ({
          buffer: positionBuffer1,
          offset: POINT_BYTES,
          stride: (joined ? 1 : 2) * POINT_BYTES,
          divisor: 1,
        }),
        positionC: (context, { joined, instances }) => ({
          buffer: positionBuffer2,
          offset: 2 * POINT_BYTES,
          stride: (joined ? 1 : 2) * POINT_BYTES,
          divisor: 1,
        }),
        positionD: (context, { joined }) => ({
          buffer: positionBuffer2,
          offset: 3 * POINT_BYTES,
          stride: (joined ? 1 : 2) * POINT_BYTES,
          divisor: 1,
        }),
      },
      count: VERTICES_PER_INSTANCE,
      instances: regl.prop("instances"),
      primitive: regl.prop("primitive"),
    })
  );

  // array reused for colors when monochrome
  const monochromeColors = new Array(VERTICES_PER_INSTANCE);
  let pointArray = new Float32Array(0);
  let allocatedPoints = 0;

  const fillPointArray = (points: any[], alreadyClosed: boolean, shouldClose: boolean) => {
    const numTotalPoints = points.length + (shouldClose ? 3 : 2);
    if (allocatedPoints < numTotalPoints) {
      pointArray = new Float32Array(numTotalPoints * 3);
      allocatedPoints = numTotalPoints;
    }
    points.forEach((point, i) => {
      const [x, y, z] = shouldConvert(point) ? pointToVec3(point) : point;
      const off = 3 + i * 3;
      pointArray[off + 0] = x;
      pointArray[off + 1] = y;
      pointArray[off + 2] = z;
    });

    // The "prior" point (A) and "next" point (D) need to be set when rendering the first & last
    // segments, so we copy data from the last point(s) to the beginning of the array, and from the
    // first point(s) to the end of the array.
    const n = numTotalPoints * 3;
    if (alreadyClosed) {
      // First and last points already match; "prior" should be the second-to-last
      // and "next" should be the second.
      pointArray.copyWithin(0, n - 9, n - 6);
      pointArray.copyWithin(n - 3, 6, 9);
    } else if (shouldClose) {
      // First point is being reused after last point; first *two* points need to be copied at the end
      pointArray.copyWithin(0, n - 9, n - 6);
      pointArray.copyWithin(n - 6, 3, 9);
    } else {
      // Endpoints are separate; just duplicate first & last points, resulting in square-looking endcaps
      pointArray.copyWithin(0, 3, 6);
      pointArray.copyWithin(n - 3, n - 6, n - 3);
    }
  };

  // Disable depth for debug rendering (so lines stay visible)
  const render = (debug, commands) => {
    if (debug) {
      regl({ depth: { enable: false } })(commands);
    } else {
      commands();
    }
  };

  // Render one line list/strip
  const renderLine = (props) => {
    const { debug, primitive = "lines", scaleInvariant = false } = props;
    const numInputPoints = props.points.length;

    if (numInputPoints < 2) {
      return;
    }

    const alreadyClosed = numInputPoints > 2 && pointsEqual(props.points[0], props.points[numInputPoints - 1]);
    // whether the first point needs to be duplicated after the last point
    const shouldClose = !alreadyClosed && props.closed;

    fillPointArray(props.points, alreadyClosed, shouldClose);
    positionBuffer1({ data: pointArray, usage: "dynamic" });
    positionBuffer2({ data: pointArray, usage: "dynamic" });

    const monochrome = !(props.colors && props.colors.length);
    let colors;
    if (monochrome) {
      if (shouldConvert(props.color)) {
        colors = monochromeColors.fill(props.color ? toRGBA(props.color) : DEFAULT_MONOCHROME_COLOR);
      } else {
        colors = monochromeColors.fill(props.color || DEFAULT_MONOCHROME_COLOR);
      }
    } else {
      if (shouldConvert(props.colors)) {
        colors = props.colors.map(toRGBA);
      } else {
        colors = props.colors.slice();
      }
      if (shouldClose) {
        colors.push(colors[0]);
      }
    }
    colorBuffer({ data: colors, usage: "dynamic" });

    const joined = primitive === "line strip";
    const effectiveNumPoints = numInputPoints + (shouldClose ? 1 : 0);
    const instances = joined ? effectiveNumPoints - 1 : Math.floor(effectiveNumPoints / 2);

    render(debug, () => {
      command({
        ...props,
        joined,
        primitive: "triangle strip",
        alpha: debug ? 0.2 : 1,
        monochrome,
        instances,
        scaleInvariant,
      });
      if (debug) {
        command({
          ...props,
          joined,
          primitive: "line strip",
          alpha: 1,
          monochrome,
          instances,
          scaleInvariant,
        });
      }
    });
  };

  return (inProps: any) => {
    if (Array.isArray(inProps)) {
      inProps.forEach(renderLine);
    } else {
      renderLine(inProps);
    }
  };
};

const Lines = makeCommand<Line>("Lines", lines, {
  getHitmapProps,
  getObjectFromHitmapId,
});

export default Lines;
