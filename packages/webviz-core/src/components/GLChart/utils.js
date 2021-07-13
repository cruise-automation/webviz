// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { type GLContext } from "./types";

export const devicePixelRatio = window.devicePixelRatio || 1;

// This is a costly operation. DO NOT use during rendering loop if possible
export const checkErrors = (gl: GLContext) => {
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

export const createGLContext = (canvas: HTMLCanvasElement): GLContext => {
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    throw new Error("Cannot initialize WebGL context");
  }

  return gl;
};

export const createShader = (gl: GLContext, type: number, source: string) => {
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

export const createShaderProgram = (gl: GLContext, vert: string, frag: string) => {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vert);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
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

export const createBuffer = (gl: GLContext, data: any) => {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
};

export const beginRender = (gl: GLContext) => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
};
