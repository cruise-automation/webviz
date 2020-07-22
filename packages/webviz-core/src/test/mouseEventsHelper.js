// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import tick from "webviz-core/shared/tick";

export async function simulateDragClick(point: number[] = [0, 0], canvas: ?HTMLCanvasElement) {
  canvas = canvas || (document.querySelectorAll("canvas")[0]: any);
  if (!canvas) {
    throw new Error("Could not find canvas element");
  }

  const [clientX, clientY] = point;
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
