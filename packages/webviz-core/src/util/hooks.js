// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { useState, useEffect } from "react";

// for sharing the same instance variable during the react life cycle
export function useConstant<T>(getValFn: () => T, teardown: (T) => any = () => {}): T {
  const [value] = useState(getValFn);
  useEffect(() => {
    return () => {
      teardown(value);
    };
  }, []);
  return value;
}

// for adding and automatically removing event listeners
export function useEventListener(
  target: Element,
  type: string,
  enable: boolean,
  handler: (any) => void,
  dependencies: any[]
) {
  useEffect(
    () => {
      if (enable) {
        target.addEventListener(type, handler);
        return () => target.removeEventListener(type, handler);
      }
    },
    [target, type, enable, ...dependencies]
  );
}
