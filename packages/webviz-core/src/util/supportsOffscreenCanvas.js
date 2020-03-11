// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import memoize from "lodash/memoize";

import reportError from "webviz-core/src/util/reportError";

const supportsOffscreenCanvas: () => boolean = memoize(
  (): boolean => {
    try {
      // $FlowFixMe This is a function that is not yet in Flow.
      document.createElement("canvas").transferControlToOffscreen();
    } catch (error) {
      reportError(
        "Rendering to a canvas in a worker is unsupported in this browser, falling back to rendering using the main thread",
        "",
        "app"
      );
      return false;
    }
    return true;
  }
);

export default supportsOffscreenCanvas;
