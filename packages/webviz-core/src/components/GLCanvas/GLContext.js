// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

// Flow does not recognize this type, so temporarily type it this way.
export type WebGL2RenderingContext = any;

export type GLContextType = $ReadOnly<{
  gl: WebGL2RenderingContext,

  // Framebuffer scale for HDPI displays (i.e. `2` for Retina).
  scale: number,
}>;

const GLContext = React.createContext<?GLContextType>();

export function useGLContext(): GLContextType {
  const context = React.useContext(GLContext);
  if (!context) {
    throw new Error("Tried to use GLContext outside of <GLContext.Provider />");
  }
  return context;
}

export default GLContext;
