// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useRef, useEffect } from "react";

type Callback = (number) => void;
// a react hook that accepts a callback function which will be called before each browser repaint
export default function useAnimationFrame(callback: Callback, disable: boolean, dependencies: any[]) {
  // persist the requestAnimationFrameId so the last refresh callback can be cancelled when component unmounts
  const rafId = useRef();
  // start the loop when the component mounts and cancel the animation frame when unmounts
  // or related dependency changes
  function createAnimationFrame(callback) {
    rafId.current = requestAnimationFrame((timestamp) => {
      createAnimationFrame(callback);
      return callback(timestamp);
    });
  }

  useEffect(
    () => {
      if (!disable) {
        createAnimationFrame(callback);
      }
      return function cleanup() {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    },
    [callback, disable, ...dependencies]
  );
}
