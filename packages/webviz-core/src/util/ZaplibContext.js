// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useEffect, useState } from "react";

import { getExperimentalFeature } from "../components/ExperimentalFeatures/storage";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";

// TODO(Paras): Once we can import zaplib at the top level, we can use
// our flow types for it instead of needing to re-define it here.
export type ZapArray = Uint8Array | Float32Array;
export type ZapParam = ZapArray | string;
export type ZaplibContextType = $ReadOnly<{|
  initialize(initParams: {
    wasmModule: string | Promise<WebAssembly.Module>,
    canvas?: HTMLCanvasElement,
    baseUri?: string,
    defaultStyles?: boolean,
    onRenderingPanic?: (error: Error) => void,
  }): Promise<void>,
  newWorkerPort: () => MessagePort,
  callRustAsync(name: string, params?: ZapParam[]): Promise<ZapParam[]>,
|}>;

const ZaplibContext = React.createContext<?ZaplibContextType>();

let zaplibInstance: ZaplibContextType | null = null;

// Used outside React
export const getZaplibContext = () => zaplibInstance;

export function ZaplibContextProvider({ children }: { children: React$Node }) {
  const [context, setContext] = useState();

  const zaplibEnabled = getExperimentalFeature("zaplib");

  useEffect(() => {
    if (!zaplibEnabled) {
      return;
    }

    if (inScreenshotTests()) {
      // Add coi-serviceworker script in header only when running stories.
      // See: https://www.npmjs.com/package/coi-serviceworker
      const script = document.createElement("script");
      script.src = "coi-serviceworker.js";
      document.getElementsByTagName("head")[0].appendChild(script);
    }

    (async () => {
      let wasmModule: WebAssembly.Module;
      try {
        // $FlowFixMe: Flow does not know how to resolve this until it's manually built. Necessary for webviz-core builds.
        wasmModule = require("target/wasm32-unknown-unknown/release/webviz-core.wasm");
      } catch (e) {
        console.error("Zaplib binaries not found.");
        return;
      }

      const zaplib = (await import("zaplib"): any);

      await zaplib.initialize({ wasmModule });
      zaplibInstance = zaplib;

      setContext(zaplib);
    })();
  }, [zaplibEnabled]);

  return <ZaplibContext.Provider value={context}>{children}</ZaplibContext.Provider>;
}

export function useZaplibContext(): ?ZaplibContextType {
  const context = React.useContext(ZaplibContext);
  return context;
}

export default ZaplibContext;
