// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// $FlowFixMe - useState is not yet in the flow definitions.
import { useEffect } from "react";

export function useEventListener(target: Element, type: string, enable: boolean, handler: (any) => void) {
  useEffect(
    () => {
      if (enable) {
        target.addEventListener(type, handler);
        return () => target.removeEventListener(type, handler);
      }
    },
    [target, type, enable]
  );
}
