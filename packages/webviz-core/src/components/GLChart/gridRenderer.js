// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Mat4 } from "gl-matrix";

import type { Bounds } from "./types";
import { type GLContextType } from "webviz-core/src/components/GLCanvas/GLContext";
import { createShaderProgram, createBuffer, checkErrors } from "webviz-core/src/components/GLCanvas/utils";

export default function gridRenderer(ctx: GLContextType) {
  const { gl } = ctx;

  const program = createShaderProgram(
    ctx,
    `
      precision highp float;

      in vec2 position;

      uniform mat4 proj;
      uniform mat4 padding;

      void main() {
        gl_Position = padding * proj * vec4(position, 0, 1);
      }
    `,
    `
      precision highp float;

      out vec4 outColor;

      void main() {
        outColor = vec4(1, 1, 1, 1);
      }
    `
  );

  // Buffer has a static size, but content is dynamic so we create it only once
  // it has to be "big enough" for storing all posible vertices. It can be resized
  // but we should do it only when necessary.
  // TODO: resize buffers when needed.
  const positionBuffer = createBuffer(ctx, new Float32Array(5000));

  const positionAttribLocation = gl.getAttribLocation(program, "position");
  const projUniformLocation = gl.getUniformLocation(program, "proj");
  const paddingUniformLocation = gl.getUniformLocation(program, "padding");

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionAttribLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);

  const error = checkErrors(ctx);
  if (error) {
    console.warn("Error creating grid renderer:", error);
    return;
  }

  let primitiveCount = 0;
  let prevBounds;

  return ({ proj, bounds, padding }: { proj: Mat4, bounds: Bounds, padding: Mat4 }) => {
    if (bounds !== prevBounds) {
      const minX = bounds.x.min;
      const maxX = bounds.x.max;
      const minY = bounds.y.min;
      const maxY = bounds.y.max;

      const positions = [];
      const xStep = (maxX - minX) / 5;
      for (let x = minX; x <= maxX; x += xStep) {
        positions.push(...[x, maxY, x, minY]);
      }

      const yStep = (maxY - minY) / 5;
      for (let y = minY; y <= maxY; y += yStep) {
        positions.push(...[minX, y, maxX, y]);
      }

      primitiveCount = positions.length / 2;
      if (primitiveCount > 0) {
        // Update position buffer data
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(positions));
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
      }
    }

    prevBounds = bounds;

    if (primitiveCount === 0) {
      return;
    }

    // Render
    gl.useProgram(program);
    gl.uniformMatrix4fv(projUniformLocation, true, proj);
    gl.uniformMatrix4fv(paddingUniformLocation, true, padding);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.LINES, 0, primitiveCount);
  };
}
