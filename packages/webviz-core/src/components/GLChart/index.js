// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Mat4 } from "gl-matrix";
import React, { useEffect, useMemo, useRef } from "react";

import gridRenderer from "./gridRenderer";
import lineRenderer from "./linesRenderer";
import pointRenderer from "./pointRenderer";
import type { Bounds } from "./types";
import { type GLContextType, useGLContext } from "webviz-core/src/components/GLCanvas/GLContext";
import { clearRect } from "webviz-core/src/components/GLCanvas/utils";
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
function computePaddingMatrix(ctx: GLContextType, x: number, y: number): Mat4 {
  const { gl, scale } = ctx;
  const { width, height } = gl.canvas;
  const sx = 1 - (scale * x) / width;
  const sy = 1 - (scale * y) / height;

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
  const elRef = useRef<?HTMLDivElement>();
  const prevRectRef = useRef();

  const glContext = useGLContext();

  const renderGrid = useMemo(() => gridRenderer(glContext), [glContext]);
  const renderPoints = useMemo(() => pointRenderer(glContext), [glContext]);
  const renderLines = useMemo(() => lineRenderer(glContext), [glContext]);

  // Memoizing data and options helps rendering functions to update
  // internal buffers only when the values actually change.
  const memoizedData = useDeepMemo(data);
  const memoizedOptions = useDeepMemo(options);
  const bounds = useMemo(() => computeDataBounds(memoizedData, memoizedOptions), [memoizedData, memoizedOptions]);
  const proj = useMemo(() => computeProjectionMatrix(bounds), [bounds]);

  // We need to use `useEffect` for rendering in order to obtain the
  // correct values for the bounding client rect.
  // TODO (hernan): I'll improve this once I fix the concurrency issue
  // happening when rendering multiple panels at the same time.
  useEffect(() => {
    const el = elRef.current;
    if (el && glContext) {
      const rect = el.getBoundingClientRect();
      clearRect(glContext, rect);
      prevRectRef.current = rect;

      // Add some margin around the chart
      const padding = computePaddingMatrix(glContext, 20, 20);

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
  }, [bounds, glContext, height, memoizedData, proj, renderGrid, renderLines, renderPoints, width]);

  useEffect(() => {
    return () => {
      // We need to clear the shared canvas during unmounting
      if (glContext && prevRectRef.current) {
        clearRect(glContext, prevRectRef.current);
      }
    };
  }, [glContext]);

  return <div ref={elRef} style={{ width, height }} />;
}
