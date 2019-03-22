// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useRef, useEffect } from "react";

// for sharing the same instance variable during the react life cycle
export default function useConstant<T>(getValFn: () => T, teardown: (T) => void = () => {}): ?T {
  const ref = useRef<T | null>(null);
  ref.current = ref.current === null ? getValFn() : ref.current;
  // To satisfy flow, we have to fallback to getValFn(), even though ref.current is not null after mount
  useEffect(() => () => teardown(ref.current || getValFn()), []);
  return ref.current || getValFn();
}
