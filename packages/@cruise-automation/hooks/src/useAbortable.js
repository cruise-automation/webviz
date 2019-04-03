// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useState, useEffect } from "react";

// https://github.com/flow-typed/flow-typed/issues/1652
declare interface AbortSignal extends EventTarget {
  +aborted: boolean;
  onabort: EventHandler;
}
declare class AbortController {
  +signal: AbortSignal;
  abort: () => void;
}

// A react hook which can be used to load async, disposable resources
// and fire the cleanup callback when the component unmounts.
// If the component unmounts before the async operation completes the
// resource will still be cleaned up once it finishes loading and an
// abort signal will be issued to the async load operation.
export default function useAbortable<T>(
  defaultValue: T,
  action: (AbortController) => Promise<T>,
  cleanup: (?T) => void,
  args: any
): [T, () => void] {
  const [result, setResult] = useState<T>(defaultValue);
  let controller;
  useEffect(() => {
    controller = new AbortController();
    const promise = action(controller).then((result: T) => {
      // If we're aborted don't set the result into state.
      // The cleanup will be called when the component unmounts.
      if (!controller.signal.aborted) {
        setResult(result);
      }
      return result;
    });
    return () => {
      setResult(defaultValue);
      // on unmount or args changing clean up the old value
      promise.then(cleanup);
      controller.abort();
    };
  }, args);
  return [result, () => controller.abort()];
}
