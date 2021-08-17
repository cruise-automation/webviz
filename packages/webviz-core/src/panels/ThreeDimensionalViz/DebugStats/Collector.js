// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { WorldviewReactContext, type WorldviewContextType } from "regl-worldview";

import { type DebugStats } from "./types";

type Props = {
  setDebugStats: (DebugStats) => void,
};

function useDebugStats(): ?DebugStats {
  const context = React.useContext<WorldviewContextType>(WorldviewReactContext);
  const renderCount = React.useRef(0);
  renderCount.current = renderCount.current + 1;
  if (context.initializedData.regl) {
    const { stats } = context.initializedData.regl;
    const { bufferCount, elementsCount, textureCount, shaderCount } = stats;
    const totalTextureSize = stats.getTotalTextureSize();
    const totalBufferSize = stats.getTotalBufferSize();
    return {
      renderCount: renderCount.current,
      bufferCount,
      elementsCount,
      textureCount,
      shaderCount,
      totalTextureSize,
      totalBufferSize,
    };
  }
}

export default function Collector(props: Props) {
  const { setDebugStats } = props;
  const debugStats = useDebugStats();
  if (debugStats) {
    setDebugStats(debugStats);
  }
  return null;
}
