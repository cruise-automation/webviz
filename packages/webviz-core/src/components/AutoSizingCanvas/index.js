// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useRef, useLayoutEffect } from "react";
import Dimensions from "react-container-dimensions";

type Draw = (context: CanvasRenderingContext2D, width: number, height: number) => void;

type CanvasProps = {
  draw: Draw,
  width: number,
  height: number,
  overrideDevicePixelRatioForTest?: number,
};

type AutoSizingCanvasProps = {
  draw: Draw,
  overrideDevicePixelRatioForTest?: number,
};

// Nested within `AutoSizingCanvas` so that componentDidUpdate fires on width/height changes.
// Adding a hook into the 'react-container-dimensions' project on resize changes might be a good improvement!
function Canvas({
  draw,
  width,
  height,
  overrideDevicePixelRatioForTest: ratio = window.devicePixelRatio || 1,
}: CanvasProps) {
  const canvasRef = useRef();
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(ctx, width, height);
  });

  return (
    <canvas
      ref={canvasRef}
      width={width * ratio}
      height={height * ratio}
      style={{
        width,
        height,
      }}
    />
  );
}

const AutoSizingCanvas = ({ draw, overrideDevicePixelRatioForTest }: AutoSizingCanvasProps) => (
  <Dimensions>
    {({ width, height }) => (
      <Canvas
        width={width}
        height={height}
        draw={draw}
        overrideDevicePixelRatioForTest={overrideDevicePixelRatioForTest}
      />
    )}
  </Dimensions>
);

export default AutoSizingCanvas;
