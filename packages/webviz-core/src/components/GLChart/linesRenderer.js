// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type GLContextType } from "webviz-core/src/components/GLCanvas/GLContext";
import { createShaderProgram, createBuffer, checkErrors } from "webviz-core/src/components/GLCanvas/utils";

export default function lineRenderer(ctx: GLContextType) {
  const { gl } = ctx;

  const program = createShaderProgram(
    ctx,
    `
      precision highp float;

      in vec2 inPosition;

      uniform mat4 proj;
      uniform mat4 padding;

      void main() {
        gl_Position = padding * proj * vec4(inPosition, 0, 1);
      }
    `,
    `
      precision highp float;

      out vec4 outColor;

      void main() {
        outColor = vec4(0, 1, 1, 1);
      }
    `
  );

  // Buffer has a static size, but content is dynamic so we create it only once
  // it has to be "big enough" for storing all posible vertices. It can be resized
  // but we should do it only when necessary.
  // TODO: resize buffers when needed.
  const positionBuffer = createBuffer(ctx, new Float32Array(10000));

  const positionAttribLocation = gl.getAttribLocation(program, "inPosition");
  const projUniformLocation = gl.getUniformLocation(program, "proj");
  const paddingUniformLocation = gl.getUniformLocation(program, "padding");

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionAttribLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);

  const error = checkErrors(ctx);
  if (error) {
    console.warn("Error creating point renderer:", error);
    return;
  }

  let primitiveCount = 0;
  let prevData;

  return ({ data, proj, padding }: any) => {
    const { datasets } = data;

    if (data !== prevData) {
      const positions = [];
      datasets.forEach((dataset) => {
        if (!dataset.showLine) {
          return;
        }
        dataset.data.forEach((datum) => {
          const { x, y } = datum;
          positions.push(x);
          positions.push(y);
        });
        positions.push(NaN);
        positions.push(NaN);
      });

      primitiveCount = positions.length / 2;
      if (primitiveCount > 0) {
        // Update position buffer data
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(positions));
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
      }

      prevData = data;
    }

    if (primitiveCount === 0) {
      return;
    }

    // Render
    gl.useProgram(program);
    gl.uniformMatrix4fv(projUniformLocation, true, proj);
    gl.uniformMatrix4fv(paddingUniformLocation, true, padding);
    gl.bindVertexArray(vao);
    gl.lineWidth(20);
    gl.drawArrays(gl.LINE_STRIP, 0, primitiveCount);
  };
}
