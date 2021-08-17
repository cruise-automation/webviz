// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type GLContextType } from "./GLContext";

// This is a costly operation. DO NOT use during rendering loop if possible
export const checkErrors = (ctx: GLContextType) => {
  const { gl } = ctx;
  const code = gl.getError();
  switch (code) {
    case gl.NO_ERROR:
      return;
    case gl.INVALID_ENUM:
      return {
        code,
        msg: "Invalid enum.",
      };
    case gl.INVALID_VALUE:
      return {
        code,
        msg: "Invalid value.",
      };
    case gl.INVALID_OPERATION:
      return {
        code,
        msg: "Invalid operation.",
      };
    case gl.INVALID_FRAMEBUFFER_OPERATION:
      return {
        code,
        msg: "Invalid Framebuffer operation.",
      };
    case gl.OUT_OF_MEMORY:
      return {
        code,
        msg: "Out of memory.",
      };
    case gl.CONTEXT_LOST_WEBGL:
      return {
        code,
        msg: "Context lost.",
      };
    default:
      return {
        code,
        msg: "Unknown error",
      };
  }
};

export const createShader = (ctx: GLContextType, type: number, source: string) => {
  const { gl } = ctx;
  if (!source.startsWith("#version")) {
    // Prepend GLES 3.0 version if none was provided
    source = `#version 300 es\n${source}`;
  }
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    const msg = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(msg);
  }
  return shader;
};

export const createShaderProgram = (ctx: GLContextType, vert: string, frag: string) => {
  const { gl } = ctx;
  const vertexShader = createShader(ctx, gl.VERTEX_SHADER, vert);
  const fragmentShader = createShader(ctx, gl.FRAGMENT_SHADER, frag);
  if (!vertexShader || !fragmentShader) {
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    const msg = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(msg);
  }

  return program;
};

export const createBuffer = (ctx: GLContextType, data: any) => {
  const { gl } = ctx;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
};

export const clearRect = (ctx: GLContextType, rect: any) => {
  const { gl, scale } = ctx;
  const width = scale * (rect.right - rect.left);
  const height = scale * (rect.bottom - rect.top);
  const left = scale * rect.left;
  const bottom = scale * (gl.canvas.clientHeight - rect.bottom);

  gl.viewport(left, bottom, width, height);
  gl.scissor(left, bottom, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
};
