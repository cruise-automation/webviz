// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useRef, useState, useCallback, useEffect } from "react";

import { useGetCurrentValue } from "webviz-core/src/util/hooks";

// Jest does not include ResizeObserver.
class ResizeObserverMock {
  _callback: (ResizeObserverEntry[]) => void;
  constructor(callback) {
    this._callback = callback;
  }

  observe() {
    const entry: any = { contentRect: { width: 150, height: 150 } };
    this._callback([entry]);
  }
  unobserve() {}
}
const ResizeObserverImpl = process.env.NODE_ENV === "test" ? (ResizeObserverMock: any) : ResizeObserver;

// Calls the provided onResized callback anytime the element is resized.
// Uses resizeObserver, which is very performant.
function useResizeObserver(onResize: (ResizeObserverEntry) => void) {
  const ref = useRef();
  const getOnResize = useGetCurrentValue(onResize);

  // This resizeObserver should never change.
  const [resizeObserver] = useState<ResizeObserver>(
    () =>
      new ResizeObserverImpl((entries) => {
        if (!entries || !entries.length) {
          return;
        }

        // We only observe a single element, so just use the first entry.
        const onResizeFn = getOnResize();
        onResizeFn(entries[0]);
      })
  );

  // Start watching the element as soon as it's set
  const setRef = useCallback((el: ?Element) => {
    if (el) {
      resizeObserver.observe(el);
    }
    ref.current = el;
  }, [resizeObserver]);

  // Stop watching the element on unmount
  useEffect(
    () => () => {
      const element = ref.current;
      if (element) {
        resizeObserver.unobserve(element);
      }
    },
    [resizeObserver]
  );

  return { ref: setRef };
}

export default useResizeObserver;
