// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useState, useEffect } from "react";

// for sharing the same instance variable during the react life cycle
export default function useConstant<T>(getValFn: () => T, teardown: (T) => any = () => {}): T {
  const [value] = useState<T>(getValFn);
  useEffect(() => {
    return () => {
      teardown(value);
    };
  }, []);
  return value;
}
