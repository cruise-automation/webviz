// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import memoize from "lodash/memoize";

import sendNotification from "webviz-core/src/util/sendNotification";

const supportsOffscreenCanvas: () => boolean = memoize(
  (): boolean => {
    try {
      // $FlowFixMe This is a function that is not yet in Flow.
      document.createElement("canvas").transferControlToOffscreen();
    } catch (error) {
      sendNotification(
        "Rendering to a canvas in a worker is unsupported in this browser, falling back to rendering using the main thread",
        "",
        "app",
        "warn"
      );
      return false;
    }
    return true;
  }
);

export default supportsOffscreenCanvas;
