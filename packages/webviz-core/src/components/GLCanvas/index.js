// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback, useState } from "react";

import Dimensions from "../Dimensions";
import GLContext, { type WebGL2RenderingContext } from "./GLContext";
import { useShallowMemo } from "webviz-core/src/util/hooks";
import { getEventInfos, logEventError } from "webviz-core/src/util/logEvent";

export default function SharedGLCanvas(props: any) {
  const [gl, setGL] = useState<?WebGL2RenderingContext>();
  const scale = window.devicePixelRatio ?? 1;
  const glContext = useShallowMemo({ scale, gl });

  const initCanvas = useCallback((canvas: ?HTMLCanvasElement) => {
    if (canvas) {
      const gl2: WebGL2RenderingContext = canvas.getContext("webgl2", {
        // Allows the canvas to be fully transparent
        premultipliedAlpha: false,
        // We will be clearing the canvas by regions, using scissor testing,
        // so we need to preserve the existing framebuffer contents. This
        // option might have some performance issues according to the spec.
        preserveDrawingBuffer: true,
      });
      if (!gl2) {
        logEventError(getEventInfos().WEBGL2_UNAVAILABLE_ERROR, { context: "sharedGLCanvas" });
        return;
      }

      gl2.enable(gl2.SCISSOR_TEST);
      gl2.viewport(0, 0, gl2.canvas.width, gl2.canvas.height);
      gl2.clearColor(0, 0, 0, 0);
      gl2.clear(gl2.COLOR_BUFFER_BIT);
      setGL(gl2);
    }
  }, []);

  return (
    <GLContext.Provider value={glContext}>
      <>
        {props.children}
        <Dimensions>
          {({ width, height }) => (
            <canvas
              id={"glCanvas"}
              ref={initCanvas}
              height={height * scale}
              width={width * scale}
              style={{
                pointerEvents: "none",
                position: "absolute",
                top: 0,
                left: 0,
                margin: 0,
                width,
                height,
                zIndex: 1000,
              }}
            />
          )}
        </Dimensions>
      </>
    </GLContext.Provider>
  );
}
