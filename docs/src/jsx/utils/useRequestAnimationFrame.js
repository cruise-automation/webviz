//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useRef, useEffect } from "react";

// a react hook that accepts a callback function which will be called before each browser repaint
export default function useRequestAnimationFrame(callback, disable, dependencies) {
  // persist the requestAnimationFrameId so the last refresh callback can be cancelled when component unmounts
  const rafId = useRef();
  // start the loop when the component mounts and cancel the animation frame when unmounts
  // or related dependency changes
  useEffect(
    () => {
      if (!disable) {
        // eslint-disable-next-line no-inner-declarations
        function createAnimationFrame() {
          rafId.current = requestAnimationFrame((timestamp) => {
            // eslint-disable-next-line callback-return
            callback(timestamp);
            createAnimationFrame();
          });
        }
        createAnimationFrame();
      }
      return function cleanup() {
        cancelAnimationFrame(rafId.current);
      };
    },
    [disable, callback, ...dependencies]
  );
}
