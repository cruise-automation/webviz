// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { useState } from "react";

import useResizeObserver from "webviz-core/src/hooks/useResizeObverver";

type DimensionsParams = {| height: number, width: number |};

// Calculates the dimensions of the element the returned ref is attached to.
export default function useDimensions() {
  const [dimensions, setDimensions] = useState<?DimensionsParams>();
  const { ref } = useResizeObserver((el) => {
    if (el) {
      // We have to round because these could be sub-pixel values.
      const newWidth = Math.round(el.contentRect.width);
      const newHeight = Math.round(el.contentRect.height);
      setDimensions({ width: newWidth, height: newHeight });
    }
  });

  return { ref, dimensions };
}
