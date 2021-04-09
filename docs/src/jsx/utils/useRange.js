//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useState, useEffect } from "react";

import { inScreenshotTests } from "./codeSandboxUtils";

export default function useRange(initialRange = 0.1) {
  const [range, setRange] = useState(initialRange);
  const [count, setCount] = useState(0);

  if (inScreenshotTests()) {
    return range;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const stop = requestAnimationFrame((tick) => {
      const newRange = (1 + Math.sin(count / 30)) / 2;
      setRange(newRange);
      setCount(count + 1);
    });

    return function cleanup() {
      cancelAnimationFrame(stop);
    };
  });
  return range;
}
