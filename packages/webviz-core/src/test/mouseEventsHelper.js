// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import tick from "webviz-core/shared/tick";

export function findCanvas(): HTMLCanvasElement {
  const canvas = (document.querySelectorAll("canvas")[0]: any);
  if (!canvas) {
    throw new Error("Could not find canvas element");
  }
  return canvas;
}

export async function simulateMouseMove(point: number[] = [0, 0], canvas: ?HTMLCanvasElement) {
  const [clientX, clientY] = point;
  canvas = canvas || findCanvas();
  canvas.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      clientX,
      clientY,
    })
  );
}

export async function simulateDragClick(point: number[] = [0, 0], canvas: ?HTMLCanvasElement) {
  const [clientX, clientY] = point;
  canvas = canvas || findCanvas();
  canvas.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      clientX,
      clientY,
    })
  );
  await tick();
  canvas.dispatchEvent(
    new MouseEvent("mouseup", {
      bubbles: true,
      clientX,
      clientY,
    })
  );
}
