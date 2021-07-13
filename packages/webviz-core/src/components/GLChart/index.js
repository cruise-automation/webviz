// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Mat4 } from "gl-matrix";
import React, { useState, useRef, useMemo, useCallback } from "react";
import uuid from "uuid";

import gridRenderer from "./gridRenderer";
import linesRenderer from "./linesRenderer";
import pointRenderer from "./pointRenderer";
import type { GLContext, Bounds } from "./types";
import { beginRender, devicePixelRatio, createGLContext } from "./utils";
import { type Props } from "webviz-core/src/components/ReactChartjs";
import { useDeepMemo } from "webviz-core/src/util/hooks";

// Compute the min/max values for each axis
// This is an expensive operation and should be called as few
// times as possible.
function computeDataBounds(data: any, options: any): Bounds {
  const {
    scales: { xAxes, yAxes },
  } = options;

  let minX = xAxes[0].ticks.min;
  let maxX = xAxes[0].ticks.max;
  let minY = yAxes[0].ticks.min;
  let maxY = yAxes[0].ticks.max;

  if (minX == null || maxX == null || minY == null || maxY == null) {
    data.datasets.forEach((dataset) => {
      dataset.data.forEach((datum) => {
        const { x, y } = datum;
        minX = !(minX == null || isNaN(minX)) ? minX : x;
        maxX = !(maxX == null || isNaN(maxX)) ? maxX : x;
        minY = !(minY == null || isNaN(minY)) ? minY : y;
        maxY = !(maxY == null || isNaN(maxY)) ? maxY : y;

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
    });
  }

  const bounds = {
    x: {
      min: minX,
      max: maxX,
    },
    y: {
      min: minY,
      max: maxY,
    },
  };

  return bounds;
}

// Compute a projection matrix
// TODO: Add types for parameters
function computeProjectionMatrix(bounds: Bounds): Mat4 {
  const minX = bounds.x.min;
  const maxX = bounds.x.max;
  const minY = bounds.y.min;
  const maxY = bounds.y.max;

  // This is the standard OpenGL orthographic matrix, except that we set
  // the third row to 0 since we don't do any operations on the Z axis
  // prettier-ignore
  return [
    2 / (maxX - minX), 0, 0, -(maxX + minX) / (maxX - minX),
    0, 2 / (maxY - minY), 0, -(maxY + minY) / (maxY - minY),
    0, 0, 0, 0,
    0, 0, 0, 1,
  ];
}

// Compute a scaling matrix to leave some space for labels and margin
function computePaddingMatrix(gl: GLContext, x: number, y: number): Mat4 {
  const { width, height } = gl.canvas;
  const sx = 1 - x / width;
  const sy = 1 - y / height;

  // This is a simple scaling matrix for X and Y axes.
  // prettier-ignore
  return [
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

export default function GLChart({ width, height, data, options }: Props) {
  const [id] = useState<string>(uuid);
  const [gl, setGL] = useState<?GLContext>();

  const canvasRef = useRef<?HTMLCanvasElement>();

  const setCanvasRef = useCallback((canvas) => {
    if (canvas) {
      if (canvasRef.current !== canvas) {
        canvasRef.current = canvas;
        // Save the GL context and force a render
        setGL(createGLContext(canvas));
      }
    }
  }, []);

  const renderGrid = useMemo(() => gridRenderer(gl), [gl]);
  const renderPoints = useMemo(() => pointRenderer(gl), [gl]);
  const renderLines = useMemo(() => linesRenderer(gl), [gl]);

  // Memoizing data and options helps rendering functions to update
  // internal buffers only when the values actually change.
  const memoizedData = useDeepMemo(data);
  const memoizedOptions = useDeepMemo(options);
  const bounds = useMemo(() => computeDataBounds(memoizedData, memoizedOptions), [memoizedData, memoizedOptions]);
  const proj = useMemo(() => computeProjectionMatrix(bounds), [bounds]);

  // Scaling the canvas will provide better looks in HDPI monitors, like Retina,
  // by increasing the presentation framebuffer resolution. This, of course, has
  // some performance impact on those devices.
  // TODO: do not scale during playback?
  const canvasScale = devicePixelRatio;

  if (gl) {
    beginRender(gl);

    // Add some margin around the chart
    const padding = computePaddingMatrix(gl, 20 * canvasScale, 20 * canvasScale);

    if (renderGrid) {
      renderGrid({ proj, bounds, padding });
    }

    if (renderLines) {
      renderLines({ data: memoizedData, proj, padding });
    }

    if (renderPoints) {
      renderPoints({ data: memoizedData, proj, padding });
    }
  }

  return (
    <canvas
      id={id}
      ref={setCanvasRef}
      height={height * canvasScale}
      width={width * canvasScale}
      style={{ width, height }}
    />
  );
}
