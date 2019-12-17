// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { WorldviewReactContext, type WorldviewContextType } from "regl-worldview";

const { useContext, useRef, useState } = React;

const MAX_RENDER_COUNT = 5;
const style = { backgroundColor: "red", position: "absolute", top: 0, left: 0, fontSize: 20 };
const keysToCheck = ["bufferCount", "elementsCount", "shaderCount", "textureCount", "framebufferCount"];
// Wrap a *static* regl rendered scene with this & it will compare stat changes across 5 renders.
// If any stats change it will output a red error box instead of the child regl components.
// Do not use in a scene that changes a lot or has external animation frames as this is only meant to render once.
// If the components within this are having their props updated externally its probably not going to work correctly.
export default function ReglLeakChecker({ children }: { children: React.Node }) {
  const context = useContext<WorldviewContextType>(WorldviewReactContext);
  const [renderCount, setRenderCount] = useState<number>(1);
  const originalStats = useRef(undefined);
  if (renderCount < MAX_RENDER_COUNT) {
    requestAnimationFrame(() => setRenderCount((count) => count + 1));
  }
  // the first two renders w/ regl initialized should initialize buffers & textures
  if (context.initializedData && renderCount > 2) {
    const stats = Object.keys(context.initializedData.regl.stats).reduce((prev, key) => {
      if (keysToCheck.includes(key)) {
        prev[key] = context.initializedData.regl.stats[key];
      }
      return prev;
    }, {});
    // save a snapshot of the first "initialized" render pass stats
    originalStats.current = originalStats.current || stats;
    if (renderCount >= MAX_RENDER_COUNT) {
      for (const key in originalStats.current) {
        const originalValue = originalStats.current[key];
        const newValue = stats[key];
        if (newValue !== originalValue) {
          const msg = `Detected regl stat drift in stat "${key}": ${originalValue} -> ${newValue}.  This might indicate a memory leak.`;
          context.onDirty();
          return <div style={style}>{msg}</div>;
        }
      }
    }
  }
  return children;
}
