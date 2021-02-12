// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useEffect } from "react";

// for adding and automatically removing event listeners
export default function useEventListener(
  target: Element,
  type: string,
  enable: boolean,
  handler: (any) => void,
  dependencies: any[]
) {
  useEffect(() => {
    if (enable) {
      target.addEventListener(type, handler);
      return () => target.removeEventListener(type, handler);
    }
  }, [target, type, enable, ...dependencies]);
}
